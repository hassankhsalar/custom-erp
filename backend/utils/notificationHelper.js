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

  return prismaClient.Notification.create({
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
};

module.exports = {
  createNotification
};
