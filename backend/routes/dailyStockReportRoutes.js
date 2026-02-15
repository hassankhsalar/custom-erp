const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureHasAnyScope } = require("../utils/associateScope");
const { runDailyStockSnapshot } = require("../services/dailyStockCron");

const prisma = new PrismaClient();
const router = express.Router();

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
};

const buildScopeFilter = (scope) => {
  if (scope.isAdmin) return undefined;
  const ors = [];
  if (scope.shops.size > 0) ors.push({ placeType: "shop", placeId: { in: Array.from(scope.shops) } });
  if (scope.stores.size > 0) ors.push({ placeType: "store", placeId: { in: Array.from(scope.stores) } });
  if (scope.factories.size > 0) ors.push({ placeType: "factory", placeId: { in: Array.from(scope.factories) } });
  return ors.length > 0 ? { OR: ors } : { id: -1 };
};

router.get("/daily-stock", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);

    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const skip = (page - 1) * limit;
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate, true);

    const where = {};
    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) where.snapshotDate.gte = startDate;
      if (endDate) where.snapshotDate.lte = endDate;
    }

    const [totalCount, rows] = await Promise.all([
      prisma.dailyStockSnapshot.count({ where }),
      prisma.dailyStockSnapshot.findMany({
        where,
        orderBy: { snapshotDate: "desc" },
        skip,
        take: limit
      })
    ]);

    res.json({
      rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    if (err.status === 403) {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "20", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/daily-stock/:snapshotId", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);

    const snapshotId = parseInt(req.params.snapshotId, 10);
    if (!snapshotId) return res.status(400).json({ error: "Invalid snapshotId" });

    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const skip = (page - 1) * limit;

    const placeType = req.query.placeType ? String(req.query.placeType).toLowerCase() : "";
    const placeId = req.query.placeId ? parseInt(req.query.placeId, 10) : null;
    const itemType = req.query.itemType ? String(req.query.itemType).toLowerCase() : "";
    const search = (req.query.search || "").toString().trim();

    const where = { snapshotId };
    if (placeType === "store" || placeType === "shop" || placeType === "factory") where.placeType = placeType;
    if (placeId) where.placeId = placeId;
    if (itemType === "product" || itemType === "material") where.itemType = itemType;
    if (search) {
      where.OR = [
        { itemName: { contains: search } },
        { placeName: { contains: search } }
      ];
    }

    const scopeFilter = buildScopeFilter(scope);
    if (scopeFilter) {
      where.AND = [scopeFilter];
    }

    const [snapshot, totalCount, rows] = await Promise.all([
      prisma.dailyStockSnapshot.findUnique({ where: { id: snapshotId } }),
      prisma.dailyStockSnapshotItem.count({ where }),
      prisma.dailyStockSnapshotItem.findMany({
        where,
        orderBy: [{ placeType: "asc" }, { placeName: "asc" }, { itemType: "asc" }, { itemName: "asc" }],
        skip,
        take: limit
      })
    ]);

    if (!snapshot) return res.status(404).json({ error: "Snapshot not found" });

    res.json({
      snapshot,
      rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    if (err.status === 403) {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "20", 10);
      return res.json({
        snapshot: null,
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/daily-stock/run-now", async (_req, res) => {
  try {
    const snapshot = await runDailyStockSnapshot(new Date());
    res.json({ message: "Daily stock snapshot generated", snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
