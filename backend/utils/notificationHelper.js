const { emitNotificationCreated } = require("../services/realtimeEmitter");
const { getRequestContext } = require("./requestContext");

const createNotification = async (prismaClient, data) => {
  const {
    title,
    description,
    link = null,
    isRead = false,
    createdAt = new Date(),
    updatedAt = new Date(),
    forRole = "admin"
  } = data;

  const notification = await prismaClient.Notification.create({
    data: {
      title,
      description,
      link,
      isRead,
      createdAt,
      updatedAt,
      forRole
    }
  });
  const context = getRequestContext();
  if (context) {
    context.manualNotificationCount = Number(context.manualNotificationCount || 0) + 1;
  }
  emitNotificationCreated(notification);
  return notification;
};

module.exports = {
  createNotification
};
