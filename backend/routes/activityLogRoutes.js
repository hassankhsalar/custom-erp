const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { logActivity } = require("../utils/activityLogger");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
    const skip = (page - 1) * limit;

    const {
      userId,
      module,
      action,
      status,
      search,
      startDate,
      endDate,
    } = req.query;

    const where = {};

    if (userId) where.userId = parseInt(userId, 10);
    if (module) where.module = module;
    if (action) where.action = action;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { module: { contains: search } },
        { action: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [rows, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

router.post("/logout", async (req, res) => {
  await logActivity({
    userId: req.user?.userId || null,
    module: "auth",
    action: "logout",
    description: "User logged out",
    status: "success",
    metadata: {},
    ipAddress: req.ip || null,
    userAgent: req.headers["user-agent"] || null,
  });

  res.json({ success: true });
});

module.exports = router;
