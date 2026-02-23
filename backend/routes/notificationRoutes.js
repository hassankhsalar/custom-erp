const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const getAllowedRolesForUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { permission: { select: { name: true } } },
  });
  const role = String(user?.permission?.name || "default").toLowerCase();
  if (role === "admin" || role === "superadmin") {
    return ["admin", "superadmin", "all"];
  }
  return [role, "all"];
};

router.get("/", async (req, res) => {
  try {
    const allowedRoles = await getAllowedRolesForUser(req.user?.userId || 0);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const where = { forRole: { in: allowedRoles } };
    const totalCount = await prisma.notification.count({ where });
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit
    });

    res.json({
      rows,
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount || 0),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/latest", async (req, res) => {
  try {
    const allowedRoles = await getAllowedRolesForUser(req.user?.userId || 0);
    const limit = parseInt(req.query.limit || "5", 10);
    const rows = await prisma.notification.findMany({
      where: { forRole: { in: allowedRoles } },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const allowedRoles = await getAllowedRolesForUser(req.user?.userId || 0);
    const count = await prisma.notification.count({
      where: { isRead: false, forRole: { in: allowedRoles } }
    });
    res.json({ count: Number(count || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/mark-all-read", async (req, res) => {
  try {
    const allowedRoles = await getAllowedRolesForUser(req.user?.userId || 0);
    await prisma.notification.updateMany({
      where: { isRead: false, forRole: { in: allowedRoles } },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
