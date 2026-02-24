const jwt = require("jsonwebtoken");

const LOGIN_WINDOW_ERROR = "Login is not allowed at this time.";
const GLOBAL_WINDOW_ERROR = "System access is restricted at this time.";
const INACTIVE_USER_ERROR = "Your account is deactivated. Please contact an administrator.";

let globalAccessCache = {
  loadedAt: 0,
  value: { enabled: false, windows: [] },
};

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return null;
  const match = timeValue.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const isWithinAllowedLoginWindow = (user, now = new Date()) => {
  const startMinutes = parseTimeToMinutes(user.loginStartTime);
  const endMinutes = parseTimeToMinutes(user.loginEndTime);

  if (startMinutes === null || endMinutes === null) return true;
  if (startMinutes === endMinutes) return true;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const normalizeGlobalConfig = (value) => {
  if (!value || typeof value !== "object") return { enabled: false, windows: [] };
  const enabled = Boolean(value.enabled);
  const windows = Array.isArray(value.windows)
    ? value.windows
        .map((w) => ({
          start: parseDateValue(w?.start),
          end: parseDateValue(w?.end),
        }))
        .filter((w) => w.start && w.end && w.end >= w.start)
    : [];
  return { enabled, windows };
};

const getGlobalAccessConfig = async (prisma) => {
  const now = Date.now();
  if (now - globalAccessCache.loadedAt < 30 * 1000) {
    return globalAccessCache.value;
  }

  const row = await prisma.businessSettings.findUnique({
    where: { key: "global_access_window" },
    select: { value: true },
  });
  globalAccessCache = {
    loadedAt: now,
    value: normalizeGlobalConfig(row?.value),
  };
  return globalAccessCache.value;
};

const isBlockedByGlobalWindow = (config, now = new Date()) => {
  if (!config?.enabled) return false;
  return (config.windows || []).some((w) => now >= w.start && now <= w.end);
};

const getAccessBlockReason = async ({ prisma, user, now = new Date() }) => {
  if (!user) return "Unauthorized";
  if (user.isActive === false) return INACTIVE_USER_ERROR;
  if (!isWithinAllowedLoginWindow(user, now)) return LOGIN_WINDOW_ERROR;

  const permissionName = String(user.permission?.name || "").toLowerCase();
  const isAdmin = permissionName === "admin" || permissionName === "superadmin";
  if (isAdmin || user.bypassGlobalAccessWindow) return null;
  const globalConfig = await getGlobalAccessConfig(prisma);
  if (isBlockedByGlobalWindow(globalConfig, now)) return GLOBAL_WINDOW_ERROR;
  return null;
};

const createSessionTracker = ({ io, prisma, jwtSecret }) => {
  const userConnections = new Map();
  const socketMeta = new Map();

  const serializeActiveUsers = () =>
    Array.from(userConnections.values())
      .map((entry) => ({
        userId: entry.userId,
        username: entry.username,
        name: entry.name,
        email: entry.email,
        permissionName: entry.permissionName,
        connectedAt: entry.connectedAt,
        lastSeenAt: entry.lastSeenAt,
        connectionCount: entry.socketIds.size,
      }))
      .sort((a, b) => a.userId - b.userId);

  const emitActiveUsersUpdate = () => {
    io.to("admin-presence").emit("active-users:update", serializeActiveUsers());
  };

  const addConnection = (socket, user) => {
    const current = userConnections.get(user.id);
    if (!current) {
      userConnections.set(user.id, {
        userId: user.id,
        username: user.username,
        name: user.name || null,
        email: user.email,
        permissionName: user.permission?.name || null,
        connectedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        socketIds: new Set([socket.id]),
      });
      return;
    }

    current.socketIds.add(socket.id);
    current.lastSeenAt = new Date().toISOString();
  };

  const removeConnection = (socketId) => {
    const meta = socketMeta.get(socketId);
    if (!meta) return;

    const current = userConnections.get(meta.userId);
    if (current) {
      current.socketIds.delete(socketId);
      current.lastSeenAt = new Date().toISOString();
      if (current.socketIds.size === 0) {
        userConnections.delete(meta.userId);
      }
    }

    socketMeta.delete(socketId);
  };

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake?.auth?.token;
      if (!rawToken) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(rawToken, jwtSecret);
      const userId = Number(decoded.userId);
      const tokenSessionVersion =
        typeof decoded.sessionVersion === "number" ? decoded.sessionVersion : 0;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          permission: {
            select: {
              name: true,
              permissions: true,
            },
          },
        },
      });

      if (!user) return next(new Error("Unauthorized"));
      if ((user.sessionVersion || 0) !== tokenSessionVersion) {
        return next(new Error("Session expired"));
      }
      const blockReason = await getAccessBlockReason({ prisma, user });
      if (blockReason) {
        return next(new Error(blockReason));
      }

      socket.user = {
        id: user.id,
        username: user.username,
        name: user.name || null,
        email: user.email,
        permissionName: user.permission?.name || null,
        permissionList: Array.isArray(user.permission?.permissions) ? user.permission.permissions : [],
      };
      socket.tokenSessionVersion = tokenSessionVersion;

      next();
    } catch (_) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const hasUserLogoutPermission = Array.isArray(user.permissionList)
      && user.permissionList.includes("user_logout");
    const isAdmin = user.permissionName === "admin"
      || user.permissionName === "superadmin"
      || hasUserLogoutPermission;
    socketMeta.set(socket.id, {
      userId: user.id,
      isAdmin,
      tokenSessionVersion: typeof socket.tokenSessionVersion === "number" ? socket.tokenSessionVersion : 0,
    });
    socket.join(`user:${user.id}`);
    if (user.permissionName) {
      socket.join(`role:${String(user.permissionName).toLowerCase()}`);
    }
    if (isAdmin) {
      socket.join("admin-presence");
    }

    addConnection(socket, user);
    emitActiveUsersUpdate();
    if (isAdmin) {
      socket.emit("active-users:update", serializeActiveUsers());
    }

    socket.on("presence:ping", () => {
      const current = userConnections.get(user.id);
      if (current) {
        current.lastSeenAt = new Date().toISOString();
      }
    });

    socket.on("disconnect", () => {
      removeConnection(socket.id);
      emitActiveUsersUpdate();
    });
  });

  setInterval(async () => {
    if (socketMeta.size === 0) return;

    try {
      const uniqueUserIds = Array.from(new Set(Array.from(socketMeta.values()).map((meta) => meta.userId)));
      const dbUsers = await prisma.user.findMany({
        where: { id: { in: uniqueUserIds } },
        select: {
          id: true,
          sessionVersion: true,
          loginStartTime: true,
          loginEndTime: true,
          isActive: true,
          bypassGlobalAccessWindow: true,
          permission: { select: { name: true } },
        },
      });

      const dbUserMap = new Map(dbUsers.map((user) => [user.id, user]));

      for (const [socketId, meta] of socketMeta.entries()) {
        const connectedSocket = io.sockets.sockets.get(socketId);
        if (!connectedSocket) continue;

        const dbUser = dbUserMap.get(meta.userId);
        if (!dbUser) {
          connectedSocket.emit("session:force-logout", {
            reason: "Session is no longer valid.",
            at: new Date().toISOString(),
          });
          connectedSocket.disconnect(true);
          continue;
        }

        if ((dbUser.sessionVersion || 0) !== (meta.tokenSessionVersion || 0)) {
          connectedSocket.emit("session:force-logout", {
            reason: "Your session has been revoked.",
            at: new Date().toISOString(),
          });
          connectedSocket.disconnect(true);
          continue;
        }

        const blockReason = await getAccessBlockReason({ prisma, user: dbUser });
        if (blockReason) {
          connectedSocket.emit("session:force-logout", {
            reason: blockReason,
            at: new Date().toISOString(),
          });
          connectedSocket.disconnect(true);
        }
      }
    } catch (error) {
      console.error("Real-time session enforcement error:", error);
    }
  }, 30 * 1000);

  return {
    getActiveUsers: () => serializeActiveUsers(),
    forceLogoutUser: async (userId, reason = "You have been logged out by an administrator.") => {
      const room = `user:${userId}`;
      io.to(room).emit("session:force-logout", {
        reason,
        at: new Date().toISOString(),
      });

      const sockets = await io.in(room).fetchSockets();
      sockets.forEach((connectedSocket) => connectedSocket.disconnect(true));
    },
    emitActiveUsersUpdate,
    isWithinAllowedLoginWindow,
    LOGIN_WINDOW_ERROR,
  };
};

module.exports = {
  createSessionTracker,
  parseTimeToMinutes,
  isWithinAllowedLoginWindow,
  getAccessBlockReason,
  LOGIN_WINDOW_ERROR,
  GLOBAL_WINDOW_ERROR,
  INACTIVE_USER_ERROR,
};
