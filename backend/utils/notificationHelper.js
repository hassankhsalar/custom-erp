const { emitNotificationCreated } = require("../services/realtimeEmitter");

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
  emitNotificationCreated(notification);
  return notification;
};

module.exports = {
  createNotification
};
