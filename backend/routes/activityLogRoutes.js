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
      fromDateTime,
      toDateTime,
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

    const from = fromDateTime || startDate;
    const to = toDateTime || endDate;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        const parsedFrom = new Date(from);
        if (!Number.isNaN(parsedFrom.getTime())) where.createdAt.gte = parsedFrom;
      }
      if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) where.createdAt.lte = parsedTo;
      }
      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
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
