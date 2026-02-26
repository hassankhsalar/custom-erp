const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();
const cache = require('../cachingService');
const LOCATION_ASSOCIATES = new Set(['store', 'shop', 'factory']);

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeTimeValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !TIME_24H_REGEX.test(value)) return "__invalid__";
  return value;
};

const getCurrentUserWithPermission = async (userId) => {
  if (!userId) return null;
  return prisma.user.findFirst({
    where: { id: Number(userId), deleted_at: false },
    include: {
      permission: {
        select: {
          name: true,
          permissions: true,
        },
      },
    },
  });
};

const canManageUserSessions = (user) => {
  if (!user || !user.permission) return false;
  if (user.permission.name === "admin" || user.permission.name === "superadmin") return true;
  const perms = Array.isArray(user.permission.permissions) ? user.permission.permissions : [];
  return perms.includes("user_logout");
};

const hasPermission = (user, permission) => {
  if (!user || !user.permission) return false;
  const role = String(user.permission.name || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return true;
  const perms = Array.isArray(user.permission.permissions) ? user.permission.permissions : [];
  return perms.includes(permission);
};

const requirePermission = async (req, res, permission) => {
  const currentUser = await getCurrentUserWithPermission(req.user?.userId);
  if (!hasPermission(currentUser, permission)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return currentUser;
};

const toRoleLabel = (permissionName) => {
  const p = String(permissionName || '').toLowerCase();
  if (p === 'admin' || p === 'superadmin') return 'ADMIN';
  return 'USER';
};

const buildLocationMaps = async () => {
  const [stores, shops, factories] = await Promise.all([
    prisma.store.findMany({ where: { deleted_at: false }, select: { id: true, name: true } }),
    prisma.shop.findMany({ where: { deleted_at: false }, select: { id: true, name: true } }),
    prisma.factory.findMany({ where: { deleted_at: false }, select: { id: true, name: true } }),
  ]);
  return {
    store: new Map(stores.map((x) => [x.id, x.name])),
    shop: new Map(shops.map((x) => [x.id, x.name])),
    factory: new Map(factories.map((x) => [x.id, x.name])),
  };
};

const mapUserForManagement = (user, locationMaps) => {
  const locations = (user.userAssociate || [])
    .filter((a) => LOCATION_ASSOCIATES.has(a.associateName))
    .map((a) => ({
      type: a.associateName,
      id: a.associateId,
      name: locationMaps?.[a.associateName]?.get(a.associateId) || `Unknown ${a.associateName}`,
    }));

  return {
    ...user,
    role: toRoleLabel(user.permission?.name),
    permissions: { locations },
  };
};

// Create new user
router.post("/", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_create");
    if (!currentUser) return;

    const { email, username, name, password, permissionId } = req.body;

    // Validate required fields
    if (!email || !username || !name || !password) {
      return res.status(400).json({ error: "Email, username, name, and password are required" });
    }

    // Check if user already exists with email
    const existingUserEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUserEmail) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Check if user already exists with username
    const existingUserUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUserUsername) {
      return res.status(400).json({ error: "User with this username already exists" });
    }

    // Check if permission exists if provided
    if (permissionId) {
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });
      
      if (!permission) {
        return res.status(400).json({ error: "Permission not found" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        name,
        password: hashedPassword,
        permissionId: permissionId ? parseInt(permissionId) : null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isActive: true,
        bypassGlobalAccessWindow: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
      }
    });

    res.status(201).json({
      message: "User created successfully",
      user
    });

  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user: " + err.message });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_edit");
    if (!currentUser) return;

    const { id } = req.params;
    const { name, email, username, permissionId, loginStartTime, loginEndTime, role, permissions, isActive, bypassGlobalAccessWindow } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: "Name, and email are required" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email already exists for other users
    const emailConflict = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: parseInt(id) }
      }
    });

    if (emailConflict) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check if username already exists for other users
    // const usernameConflict = await prisma.user.findFirst({
    //   where: {
    //     username,
    //     NOT: { id: parseInt(id) }
    //   }
    // });

    // if (usernameConflict) {
    //   return res.status(400).json({ error: "Username already exists" });
    // }

    let resolvedPermissionId = existingUser.permissionId;
    if (permissionId !== undefined) {
      if (permissionId === null) {
        resolvedPermissionId = null;
      } else {
        const permission = await prisma.permission.findUnique({
          where: { id: parseInt(permissionId) }
        });
        if (!permission) {
          return res.status(400).json({ error: "Permission not found" });
        }
        resolvedPermissionId = permission.id;
      }
    } else if (typeof role === "string") {
      if (role.toUpperCase() === "ADMIN") {
        const adminPermission = await prisma.permission.findFirst({
          where: { name: { in: ["admin", "superadmin"] } },
          orderBy: { id: "asc" }
        });
        if (adminPermission) resolvedPermissionId = adminPermission.id;
      } else if (role.toUpperCase() === "USER") {
        const userPermission = await prisma.permission.findFirst({
          where: { name: { in: ["default", "user", "manager", "cashier", "store_keeper"] } },
          orderBy: { id: "asc" }
        });
        if (userPermission) resolvedPermissionId = userPermission.id;
      }
    }

    const normalizedStartTime = normalizeTimeValue(loginStartTime);
    const normalizedEndTime = normalizeTimeValue(loginEndTime);
    if (normalizedStartTime === "__invalid__" || normalizedEndTime === "__invalid__") {
      return res.status(400).json({ error: "Invalid time format. Use HH:mm" });
    }

    // Update user
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parseInt(id) },
        data: {
          name,
          email,
          username,
          permissionId: resolvedPermissionId,
          isActive: typeof isActive === "boolean" ? isActive : existingUser.isActive,
          bypassGlobalAccessWindow: typeof bypassGlobalAccessWindow === "boolean" ? bypassGlobalAccessWindow : existingUser.bypassGlobalAccessWindow,
          loginStartTime: normalizedStartTime !== null || loginStartTime === null || loginStartTime === "" ? normalizedStartTime : existingUser.loginStartTime,
          loginEndTime: normalizedEndTime !== null || loginEndTime === null || loginEndTime === "" ? normalizedEndTime : existingUser.loginEndTime,
        },
      });

      const incomingLocations = Array.isArray(permissions?.locations) ? permissions.locations : null;
      if (incomingLocations) {
        await tx.userAssociate.deleteMany({
          where: {
            userId: parseInt(id),
            associateName: { in: ["store", "shop", "factory"] },
          },
        });

        const createRows = [];
        for (const loc of incomingLocations) {
          const type = String(loc?.type || "").toLowerCase();
          const associateId = parseInt(loc?.id, 10);
          if (!LOCATION_ASSOCIATES.has(type) || !associateId) continue;
          createRows.push({
            userId: parseInt(id),
            associateName: type,
            associateId,
          });
        }

        if (createRows.length) {
          await tx.userAssociate.createMany({
            data: createRows,
            skipDuplicates: true,
          });
        }
      }
    });

    const locationMaps = await buildLocationMaps();
    const updatedUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        isActive: true,
        bypassGlobalAccessWindow: true,
        createdAt: true,
        updatedAt: true,
        userAssociate: {
          select: {
            associateName: true,
            associateId: true,
          },
        },
      }
    });

    cache.del(`user_${id}`);

    res.json({
      message: "User updated successfully",
      user: mapUserForManagement(updatedUser, locationMaps)
    });

  } catch (err) {
    console.error("Update user error:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(500).json({ error: "Failed to update user: " + err.message });
  }
});

// Get all users (for user management page)
router.get("/", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_read");
    if (!currentUser) return;

    const locationMaps = await buildLocationMaps();
    const users = await prisma.user.findMany({
      where: { deleted_at: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        isActive: true,
        bypassGlobalAccessWindow: true,
        createdAt: true,
        updatedAt: true,
        userAssociate: {
          select: {
            associateName: true,
            associateId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users.map((u) => mapUserForManagement(u, locationMaps)));
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req, res, next) => {
  try {
    const currentUser = await requirePermission(req, res, "user_read");
    if (!currentUser) return;

    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return next();
    }
    const cacheKey = `user_${id}`;

    const cachedUser = cache.get(cacheKey);
    if (cachedUser) {
      return res.json(cachedUser);
    }

    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), deleted_at: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        isActive: true,
        bypassGlobalAccessWindow: true,
        createdAt: true,
        updatedAt: true,
        userAssociate: {
          select: {
            associateName: true,
            associateId: true,
          },
        },
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const locationMaps = await buildLocationMaps();
    const mapped = mapUserForManagement(user, locationMaps);
    cache.set(cacheKey, mapped);
    res.json(mapped);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Soft delete user
router.delete("/:id", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_delete");
    if (!currentUser) return;

    const { id } = req.params;

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at: true,
        isActive: false,
        sessionVersion: { increment: 1 },
      },
    });

    cache.del(`user_${id}`);

    res.json({ message: "User archived successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
});

router.patch("/:id/active", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_activate_deactivate");
    if (!currentUser) return;

    const id = parseInt(req.params.id, 10);
    const isActive = Boolean(req.body?.isActive);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive,
        sessionVersion: isActive ? undefined : { increment: 1 },
      },
      select: {
        id: true,
        isActive: true,
      },
    });
    cache.del(`user_${id}`);
    res.json({ message: "User status updated", user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update user status" });
  }
});

router.get("/access-window/global", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_edit");
    if (!currentUser) return;
    const row = await prisma.businessSettings.findUnique({ where: { key: "global_access_window" } });
    res.json(row?.value || { enabled: false, windows: [] });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch global access window" });
  }
});

router.put("/access-window/global", async (req, res) => {
  try {
    const currentUser = await requirePermission(req, res, "user_edit");
    if (!currentUser) return;
    const value = req.body?.value;
    if (!value || typeof value !== "object") {
      return res.status(400).json({ error: "value object is required" });
    }
    const saved = await prisma.businessSettings.upsert({
      where: { key: "global_access_window" },
      update: { value },
      create: { key: "global_access_window", value },
    });
    res.json(saved.value);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to save global access window" });
  }
});

// Get user by username
router.get("/username/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findFirst({
      where: { username, deleted_at: false },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by email error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Assign/update permission for a user
router.put("/:userId/permission", async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionId } = req.body;

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If permissionId is provided, check if permission exists
    if (permissionId !== undefined && permissionId !== null) {
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });

      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
    }

    // Update user's permission
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        permissionId: permissionId === null ? null : parseInt(permissionId)
      },
      select: {
        id: true,
        email: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user permission:", error);
    res.status(500).json({ error: "Failed to update user permission" });
  }
});

// Get user's permissions
router.get("/:userId/permissions", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false },
      select: {
        id: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return permissions array or empty array
    const permissions = user.permission?.permissions || [];
    res.json({ 
      userId: user.id,
      username: user.username,
      permissionName: user.permission?.name,
      permissions: permissions
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ error: "Failed to fetch user permissions" });
  }
});

// Get currently active users (real-time presence data)
router.get("/active-sessions", async (req, res) => {
  try {
    const currentUser = await getCurrentUserWithPermission(req.user?.userId);
    if (!canManageUserSessions(currentUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sessionTracker = req.app.get("sessionTracker");
    if (!sessionTracker) {
      return res.status(500).json({ error: "Session tracker is not initialized" });
    }

    res.json(sessionTracker.getActiveUsers());
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

// Force logout a user immediately
router.post("/:id/force-logout", async (req, res) => {
  try {
    const currentUser = await getCurrentUserWithPermission(req.user?.userId);
    if (!canManageUserSessions(currentUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: false },
      select: { id: true, sessionVersion: true, username: true },
    });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        sessionVersion: (targetUser.sessionVersion || 0) + 1,
      },
    });

    const sessionTracker = req.app.get("sessionTracker");
    if (sessionTracker) {
      await sessionTracker.forceLogoutUser(
        targetUserId,
        "You have been logged out by an administrator."
      );
    }

    res.json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error forcing user logout:", error);
    res.status(500).json({ error: "Failed to force logout user" });
  }
});

// Check if user has specific permission
router.get("/:userId/has-permission/:permission", async (req, res) => {
  try {
    const { userId, permission } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false },
      select: {
        id: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Admin users have all permissions
    if (user.permission && user.permission.name === 'admin') {
      return res.json({ 
        hasPermission: true, 
        isAdmin: true,
        userId: user.id,
        username: user.username
      });
    }

    // Check if user has permission
    const userPermissions = user.permission?.permissions || [];
    const hasPermission = Array.isArray(userPermissions) 
      ? userPermissions.includes(permission)
      : false;

    res.json({ 
      hasPermission,
      isAdmin: false,
      userId: user.id,
      username: user.username,
      permissionName: user.permission?.name
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

module.exports = router;
