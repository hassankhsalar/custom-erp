let ioRef = null;

const setRealtimeIo = (io) => {
  ioRef = io;
};

const emitNotificationCreated = (notification) => {
  if (!ioRef || !notification) return;
  const forRole = String(notification.forRole || "").toLowerCase();

  if (forRole) {
    ioRef.to(`role:${forRole}`).emit("notification:new", notification);
  }
  if (forRole === "admin") {
    ioRef.to("role:superadmin").emit("notification:new", notification);
    ioRef.to("admin-presence").emit("notification:new", notification);
  }
};

module.exports = {
  setRealtimeIo,
  emitNotificationCreated,
};
