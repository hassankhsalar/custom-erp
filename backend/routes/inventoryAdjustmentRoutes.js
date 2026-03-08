const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureIdScope } = require("../utils/associateScope");
const { toEnglishDigits } = require("../utils/numberLooseSearch");

const prisma = new PrismaClient();
const router = express.Router();

const normalizeLooseSearch = (value) => toEnglishDigits(String(value || "").toLowerCase());

const parseNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildDateFilter = (dateFrom, dateTo) => {
  const createdAt = {};
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  return Object.keys(createdAt).length ? createdAt : null;
};

const buildScopeWhere = (scope) => {
  if (scope.isAdmin) return {};
  const storeIds = Array.from(scope.stores || []);
  const shopIds = Array.from(scope.shops || []);
  const factoryIds = Array.from(scope.factories || []);
  const OR = [];
  if (storeIds.length) OR.push({ placeType: "store", storeId: { in: storeIds } });
  if (shopIds.length) OR.push({ placeType: "shop", shopId: { in: shopIds } });
  if (factoryIds.length) OR.push({ placeType: "factory", factoryId: { in: factoryIds } });
  if (!OR.length) return { id: -1 };
  return { OR };
};

const withPlaceFilter = (where, placeType, placeId) => {
  if (!placeType || !placeId) return where;
  if (placeType === "store") return { ...where, placeType, storeId: placeId };
  if (placeType === "shop") return { ...where, placeType, shopId: placeId };
  if (placeType === "factory") return { ...where, placeType, factoryId: placeId };
  return where;
};

router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "20",
      itemType = "",
      productId = "",
      materialId = "",
      placeType = "",
      placeId = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const parsedPlaceId = parseNum(placeId);
    if (placeType && parsedPlaceId) {
      ensureIdScope(scope, String(placeType), parsedPlaceId);
    }

    let where = {
      ...buildScopeWhere(scope),
    };

    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.date = dateFilter;
    if (itemType) where.itemType = String(itemType).toLowerCase();
    if (productId && parseNum(productId)) where.productId = parseNum(productId);
    if (materialId && parseNum(materialId)) where.materialId = parseNum(materialId);
    where = withPlaceFilter(where, String(placeType || "").toLowerCase(), parsedPlaceId);

    const [items, totalCount] = await prisma.$transaction([
      prisma.inventoryAdjustment.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limitNum,
        include: {
          product: { select: { id: true, name: true, barcode: true, brand: true, category: true, image: true, unit: true } },
          material: { select: { id: true, name: true, barcode: true, brand: true, category: true, image: true, unit: true } },
        },
      }),
      prisma.inventoryAdjustment.count({ where }),
    ]);

    return res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
      },
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: error.message || "Failed to fetch inventory adjustments" });
  }
});

router.get("/item", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "20",
      itemType = "",
      itemId = "",
      placeType = "",
      placeId = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const normalizedType = String(itemType || "").toLowerCase();
    const parsedItemId = parseNum(itemId);
    if (!["product", "material"].includes(normalizedType) || !parsedItemId) {
      return res.status(400).json({ error: "itemType and itemId are required" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const parsedPlaceId = parseNum(placeId);
    if (placeType && parsedPlaceId) {
      ensureIdScope(scope, String(placeType), parsedPlaceId);
    }

    let where = {
      ...buildScopeWhere(scope),
      itemType: normalizedType,
      ...(normalizedType === "product" ? { productId: parsedItemId } : { materialId: parsedItemId }),
    };
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.date = dateFilter;
    where = withPlaceFilter(where, String(placeType || "").toLowerCase(), parsedPlaceId);

    const [items, totalCount] = await prisma.$transaction([
      prisma.inventoryAdjustment.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.inventoryAdjustment.count({ where }),
    ]);

    return res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
      },
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: error.message || "Failed to fetch item adjustment history" });
  }
});

router.get("/place-summary", async (req, res) => {
  try {
    const {
      placeType = "",
      placeId = "",
      dateFrom = "",
      dateTo = "",
      itemType = "all",
      search = "",
      page = "1",
      limit = "20",
    } = req.query;

    const normalizedPlaceType = String(placeType || "").toLowerCase();
    const parsedPlaceId = parseNum(placeId);
    if (!["store", "shop", "factory"].includes(normalizedPlaceType) || !parsedPlaceId) {
      return res.status(400).json({ error: "placeType and placeId are required" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, normalizedPlaceType, parsedPlaceId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    let where = withPlaceFilter({}, normalizedPlaceType, parsedPlaceId);
    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) where.date = dateFilter;
    if (itemType === "product" || itemType === "material") {
      where.itemType = itemType;
    }

    const rows = await prisma.inventoryAdjustment.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, barcode: true, brand: true, category: true, image: true, unit: true } },
        material: { select: { id: true, name: true, barcode: true, brand: true, category: true, image: true, unit: true } },
      },
      orderBy: { date: "desc" },
    });

    const grouped = new Map();
    rows.forEach((row) => {
      const key = `${row.itemType}:${row.itemType === "product" ? row.productId : row.materialId}`;
      const itemRef = row.itemType === "product" ? row.product : row.material;
      if (!grouped.has(key)) {
        grouped.set(key, {
          itemType: row.itemType,
          itemId: row.itemType === "product" ? row.productId : row.materialId,
          image: itemRef?.image || null,
          name: itemRef?.name || "-",
          barcode: itemRef?.barcode || "",
          brand: itemRef?.brand || "",
          category: itemRef?.category || "",
          unit: itemRef?.unit || (row.itemType === "product" ? "pcs" : ""),
          avgUnitPrice: 0,
          quantity: 0,
          totalAdjustedDebit: 0,
          totalAdjustedCredit: 0,
          adjustmentsCount: 0,
          lastAdjustedAt: row.date,
        });
      }
      const target = grouped.get(key);
      const qty = Number(row.quantity || 0);
      const unitPrice = Number(row.unitPrice || 0);
      target.quantity += qty;
      target.adjustmentsCount += 1;
      target.avgUnitPrice += unitPrice;
      if (qty > 0) {
        target.totalAdjustedCredit += qty * unitPrice;
      } else if (qty < 0) {
        target.totalAdjustedDebit += Math.abs(qty) * unitPrice;
      }
      if (!target.lastAdjustedAt || new Date(row.date) > new Date(target.lastAdjustedAt)) {
        target.lastAdjustedAt = row.date;
      }
    });

    let items = Array.from(grouped.values()).map((x) => ({
      ...x,
      avgUnitPrice: x.adjustmentsCount > 0 ? x.avgUnitPrice / x.adjustmentsCount : 0,
    }));

    if (search) {
      const q = normalizeLooseSearch(search);
      items = items.filter((x) =>
        normalizeLooseSearch(x.name).includes(q) ||
        normalizeLooseSearch(x.barcode).includes(q) ||
        normalizeLooseSearch(x.brand).includes(q) ||
        normalizeLooseSearch(x.category).includes(q)
      );
    }

    const totalCount = items.length;
    const start = (pageNum - 1) * limitNum;
    const paged = items.slice(start, start + limitNum);

    return res.json({
      items: paged,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
      },
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    return res.status(500).json({ error: error.message || "Failed to fetch place adjustment summary" });
  }
});

module.exports = router;



