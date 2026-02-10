const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const totalCount = await prisma.notification.count();
    const rows = await prisma.notification.findMany({
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
    const limit = parseInt(req.query.limit || "5", 10);
    const rows = await prisma.notification.findMany({
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
    const count = await prisma.notification.count({
      where: { isRead: false }
    });
    res.json({ count: Number(count || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/mark-all-read", async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
