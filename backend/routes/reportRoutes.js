const express = require("express");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureHasAnyScope, ensureIdScope, buildLocationOrFilter, buildTransferOrFilter } = require("../utils/associateScope");

const getScope = async (req) => {
  const scope = await buildScope(prisma, req.user?.userId || 0);
  ensureHasAnyScope(scope);
  return scope;
};

const sum = (arr, key) => arr.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0);

const parseMonthRange = (month) => {
  const [yearStr, monthStr] = String(month || "").split("-");
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  if (!year || !mon) return null;
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59, 999);
  return { start, end };
};

const parseDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  return { start, end };
};

const toNum = (v, fallback = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const sortRowsByLowStockWise = (rows, sortOrder) => {
  const dir = String(sortOrder || "asc").toLowerCase() === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const aScore = toNum(a.stock) - toNum(a.alert_quantity);
    const bScore = toNum(b.stock) - toNum(b.alert_quantity);
    if (aScore === bScore) return 0;
    return aScore > bScore ? dir : -dir;
  });
};

const paginateRows = (rows, page, limit) => {
  const totalCount = rows.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const start = (page - 1) * limit;
  return {
    rows: rows.slice(start, start + limit),
    pagination: { page, limit, totalCount, totalPages },
  };
};

const buildSaleScopeSql = (scope) => {
  if (scope.isAdmin) return Prisma.sql`1=1`;
  const clauses = [];
  const shopIds = Array.from(scope.shops || []);
  const storeIds = Array.from(scope.stores || []);
  if (shopIds.length) clauses.push(Prisma.sql`shopId IN (${Prisma.join(shopIds)})`);
  if (storeIds.length) clauses.push(Prisma.sql`storeId IN (${Prisma.join(storeIds)})`);
  if (!clauses.length) return Prisma.sql`1=0`;
  return Prisma.sql`(${Prisma.join(clauses, Prisma.sql` OR `)})`;
};

const buildPurchaseScopeSql = (scope) => {
  if (scope.isAdmin) return Prisma.sql`1=1`;
  const clauses = [];
  const shopIds = Array.from(scope.shops || []);
  const storeIds = Array.from(scope.stores || []);
  const factoryIds = Array.from(scope.factories || []);
  if (shopIds.length) clauses.push(Prisma.sql`(destinationType = 'shop' AND destinationId IN (${Prisma.join(shopIds)}))`);
  if (storeIds.length) clauses.push(Prisma.sql`(destinationType = 'store' AND destinationId IN (${Prisma.join(storeIds)}))`);
  if (factoryIds.length) clauses.push(Prisma.sql`(destinationType = 'factory' AND destinationId IN (${Prisma.join(factoryIds)}))`);
  if (!clauses.length) return Prisma.sql`1=0`;
  return Prisma.sql`(${Prisma.join(clauses, Prisma.sql` OR `)})`;
};

router.get("/sales/per-date", async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ error: "month is required (YYYY-MM)" });
    const scope = await getScope(req);
    const scopeSql = buildSaleScopeSql(scope);

    const rows = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date,
             COUNT(*) as saleCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(total_cost, 0)) as totalCost
      FROM \`Sale\`
      WHERE createdAt >= ${range.start} AND createdAt <= ${range.end} AND ${scopeSql}
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) ASC
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        saleCount: Number(r.saleCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        totalCost: Number(r.totalCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales/per-month", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year) return res.status(400).json({ error: "year is required" });
    const scope = await getScope(req);
    const scopeSql = buildSaleScopeSql(scope);

    const rows = await prisma.$queryRaw`
      SELECT MONTH(createdAt) as month,
             COUNT(*) as saleCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(total_cost, 0)) as totalCost
      FROM \`Sale\`
      WHERE YEAR(createdAt) = ${year} AND ${scopeSql}
      GROUP BY MONTH(createdAt)
      ORDER BY MONTH(createdAt) ASC
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        month: Number(r.month || 0),
        saleCount: Number(r.saleCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        totalCost: Number(r.totalCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales/all", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const { start, end } = parseDateRange(startDate, endDate);

    const scope = await getScope(req);
    const scopeSql = buildSaleScopeSql(scope);

    const whereClause = start && end
      ? Prisma.sql`WHERE createdAt >= ${start} AND createdAt <= ${end} AND ${scopeSql}`
      : Prisma.sql`WHERE ${scopeSql}`;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT DATE(createdAt) as date
        FROM \`Sale\`
        ${whereClause}
        GROUP BY DATE(createdAt)
      ) t
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date,
             COUNT(*) as saleCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(total_cost, 0)) as totalCost
      FROM \`Sale\`
      ${whereClause}
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        saleCount: Number(r.saleCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        totalCost: Number(r.totalCost || 0)
      })),
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount || 0),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    if (err.status === 403) {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchases/per-date", async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ error: "month is required (YYYY-MM)" });
    const scope = await getScope(req);
    const scopeSql = buildPurchaseScopeSql(scope);

    const rows = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date,
             COUNT(*) as purchaseCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(shippingCost, 0)) as shippingCost
      FROM \`Purchase\`
      WHERE createdAt >= ${range.start} AND createdAt <= ${range.end} AND ${scopeSql}
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) ASC
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        purchaseCount: Number(r.purchaseCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        shippingCost: Number(r.shippingCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchases/per-month", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year) return res.status(400).json({ error: "year is required" });
    const scope = await getScope(req);
    const scopeSql = buildPurchaseScopeSql(scope);

    const rows = await prisma.$queryRaw`
      SELECT MONTH(createdAt) as month,
             COUNT(*) as purchaseCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(shippingCost, 0)) as shippingCost
      FROM \`Purchase\`
      WHERE YEAR(createdAt) = ${year} AND ${scopeSql}
      GROUP BY MONTH(createdAt)
      ORDER BY MONTH(createdAt) ASC
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        month: Number(r.month || 0),
        purchaseCount: Number(r.purchaseCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        shippingCost: Number(r.shippingCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchases/all", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const { start, end } = parseDateRange(startDate, endDate);

    const scope = await getScope(req);
    const scopeSql = buildPurchaseScopeSql(scope);

    const whereClause = start && end
      ? Prisma.sql`WHERE createdAt >= ${start} AND createdAt <= ${end} AND ${scopeSql}`
      : Prisma.sql`WHERE ${scopeSql}`;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT DATE(createdAt) as date
        FROM \`Purchase\`
        ${whereClause}
        GROUP BY DATE(createdAt)
      ) t
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT DATE(createdAt) as date,
             COUNT(*) as purchaseCount,
             SUM(grandTotal) as totalAmount,
             SUM(COALESCE(shippingCost, 0)) as shippingCost
      FROM \`Purchase\`
      ${whereClause}
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        purchaseCount: Number(r.purchaseCount || 0),
        totalAmount: Number(r.totalAmount || 0),
        shippingCost: Number(r.shippingCost || 0)
      })),
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount || 0),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    if (err.status === 403) {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/trial-balance", async (req, res) => {
  try {
    const transactions = await prisma.transactions.findMany({
      select: { accountId: true, amount: true, added_to_account: true }
    });
    const accounts = await prisma.accounts.findMany({ select: { id: true, name: true, balance: true } });

    const totalsByAccount = {};
    transactions.forEach(t => {
      if (!totalsByAccount[t.accountId]) totalsByAccount[t.accountId] = { debit: 0, credit: 0 };
      const amt = parseFloat(t.amount) || 0;
      if (t.added_to_account === true) totalsByAccount[t.accountId].credit += amt;
      if (t.added_to_account === false) totalsByAccount[t.accountId].debit += amt;
    });

    const rows = accounts.map(a => ({
      accountId: a.id,
      name: a.name,
      debit: totalsByAccount[a.id]?.debit || 0,
      credit: totalsByAccount[a.id]?.credit || 0,
      balance: parseFloat(a.balance || 0)
    }));

    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/cash-bank", async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({ select: { id: true, name: true, balance: true } });
    const banks = await prisma.bankAccount.findMany({ select: { id: true, name: true, current_balance: true } });
    res.json({ accounts, banks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sales", async (req, res) => {
  try {
    const scope = await getScope(req);
    const sales = await prisma.sale.findMany({ 
      where: buildSaleScopeWhere(scope),
      select: { grandTotal: true, createdAt: true } 
    });
    res.json({ totalSales: sum(sales, "grandTotal"), count: sales.length });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ totalSales: 0, count: 0 });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchases", async (req, res) => {
  try {
    const scope = await getScope(req);
    const purchaseWhere = buildLocationOrFilter(scope);
    const purchases = await prisma.purchase.findMany({ 
      where: purchaseWhere,
      select: { grandTotal: true, createdAt: true } 
    });
    res.json({ totalPurchases: sum(purchases, "grandTotal"), count: purchases.length });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ totalPurchases: 0, count: 0 });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/production", async (req, res) => {
  try {
    const scope = await getScope(req);
    if (!scope.isAdmin && scope.factories.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    const where = scope.isAdmin ? {} : { factoryId: { in: Array.from(scope.factories) } };
    const productions = await prisma.production.findMany({ where, select: { status: true } });
    const byStatus = productions.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ count: productions.length, byStatus });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ count: 0, byStatus: {} });
    }
    res.status(500).json({ error: err.message });
  }
});

// Production report (factory based)
router.get("/production/summary", async (req, res) => {
  try {
    const factoryId = parseInt(req.query.factoryId);
    if (!factoryId) return res.status(400).json({ error: "factoryId is required" });
    const scope = await getScope(req);
    ensureIdScope(scope, "factory", factoryId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const where = { factoryId };
    if (start && end) {
      where.start_date = { gte: start };
      where.estimated_end_date = { lte: end };
    }

    const productions = await prisma.production.findMany({
      where,
      select: { status: true }
    });
    const byStatus = productions.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ count: productions.length, byStatus });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ count: 0, byStatus: {} });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/production/products", async (req, res) => {
  try {
    const factoryId = parseInt(req.query.factoryId);
    if (!factoryId) return res.status(400).json({ error: "factoryId is required" });
    const scope = await getScope(req);
    ensureIdScope(scope, "factory", factoryId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const dateClause = start && end
      ? Prisma.sql`AND p.start_date >= ${start} AND p.estimated_end_date <= ${end}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT pp.productId
        FROM \`ProductionProducts\` pp
        JOIN \`Production\` p ON p.id = pp.productionId
        WHERE p.factoryId = ${factoryId}
        ${dateClause}
        GROUP BY pp.productId
      ) t
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT pp.productId,
             prod.name,
             prod.category,
             prod.image,
             SUM(pp.quantity) as totalProduced,
             SUM(pp.scrap) as totalScrap,
             AVG(pp.unit_cost) as avgCost,
             AVG(TIMESTAMPDIFF(HOUR, p.start_date, COALESCE(p.end_date, p.updatedAt))) as avgHours
      FROM \`ProductionProducts\` pp
      JOIN \`Production\` p ON p.id = pp.productionId
      JOIN \`Product\` prod ON prod.id = pp.productId
      WHERE p.factoryId = ${factoryId}
      ${dateClause}
      GROUP BY pp.productId
      ORDER BY totalProduced DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const processingRows = await prisma.$queryRaw`
      SELECT pp.productId,
             SUM(pp.quantity - COALESCE(pp.received, 0)) as processingQty
      FROM \`ProductionProducts\` pp
      JOIN \`Production\` p ON p.id = pp.productionId
      WHERE p.factoryId = ${factoryId}
        AND p.status <> 'production_done'
        ${dateClause}
      GROUP BY pp.productId
    `;
    const processingMap = {};
    processingRows.forEach(r => {
      processingMap[r.productId] = Number(r.processingQty || 0);
    });

    const factoryStocks = await prisma.factoryProduct.findMany({
      where: { factoryId },
      select: { productId: true, stock: true, scrap: true }
    });
    const stockMap = {};
    factoryStocks.forEach(s => { stockMap[s.productId] = s; });

    const rowsWithStock = rows.map(r => ({
      ...r,
      currentStock: stockMap[r.productId]?.stock || 0,
      currentScrap: stockMap[r.productId]?.scrap || 0,
      processingStock: processingMap[r.productId] || 0
    }));

    res.json({
      rows: rowsWithStock,
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
      const limit = parseInt(req.query.limit || "10", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Wastage report
router.get("/wastage/materials", async (req, res) => {
  try {
    const factoryId = parseInt(req.query.factoryId);
    if (!factoryId) return res.status(400).json({ error: "factoryId is required" });
    const scope = await getScope(req);
    ensureIdScope(scope, "factory", factoryId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const dateClause = start && end
      ? Prisma.sql`AND p.start_date >= ${start} AND p.start_date <= ${end}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT pm.materialId
        FROM \`ProductionMaterial\` pm
        JOIN \`Production\` p ON p.id = pm.productionId
        WHERE p.factoryId = ${factoryId}
        ${dateClause}
        GROUP BY pm.materialId
      ) t
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT pm.materialId,
             m.name,
             m.brand,
             m.unit,
             SUM(pm.scrap) as totalScrap,
             SUM(pm.quantity) as totalUsed
      FROM \`ProductionMaterial\` pm
      JOIN \`Production\` p ON p.id = pm.productionId
      JOIN \`Material\` m ON m.id = pm.materialId
      WHERE p.factoryId = ${factoryId}
      ${dateClause}
      GROUP BY pm.materialId
      ORDER BY totalScrap DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const factoryMaterials = await prisma.factoryMaterial.findMany({
      where: { factoryId },
      select: { materialId: true, scrap: true }
    });
    const scrapMap = {};
    factoryMaterials.forEach(s => { scrapMap[s.materialId] = s; });

    const output = rows.map(r => ({
      ...r,
      totalScrap: Number(r.totalScrap || 0),
      totalUsed: Number(r.totalUsed || 0),
      scrapPercent: r.totalUsed ? (Number(r.totalScrap || 0) / Number(r.totalUsed || 0)) * 100 : 0,
      currentScrap: scrapMap[r.materialId]?.scrap || 0
    }));

    res.json({
      rows: output,
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
      const limit = parseInt(req.query.limit || "10", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/wastage/products", async (req, res) => {
  try {
    const factoryId = parseInt(req.query.factoryId);
    if (!factoryId) return res.status(400).json({ error: "factoryId is required" });
    const scope = await getScope(req);
    ensureIdScope(scope, "factory", factoryId);
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const dateClause = start && end
      ? Prisma.sql`AND p.start_date >= ${start} AND p.start_date <= ${end}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT pp.productId
        FROM \`ProductionProducts\` pp
        JOIN \`Production\` p ON p.id = pp.productionId
        WHERE p.factoryId = ${factoryId}
        ${dateClause}
        GROUP BY pp.productId
      ) t
    `;
    const totalCount = Number(totalRows[0]?.count) || 0;

    const rows = await prisma.$queryRaw`
      SELECT pp.productId,
             pr.name,
             pr.category,
             SUM(pp.scrap) as totalScrap,
             SUM(pp.quantity) as totalProduced
      FROM \`ProductionProducts\` pp
      JOIN \`Production\` p ON p.id = pp.productionId
      JOIN \`Product\` pr ON pr.id = pp.productId
      WHERE p.factoryId = ${factoryId}
      ${dateClause}
      GROUP BY pp.productId
      ORDER BY totalScrap DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const factoryProducts = await prisma.factoryProduct.findMany({
      where: { factoryId },
      select: { productId: true, scrap: true }
    });
    const scrapMap = {};
    factoryProducts.forEach(s => { scrapMap[s.productId] = s; });

    const output = rows.map(r => ({
      ...r,
      totalScrap: Number(r.totalScrap || 0),
      totalProduced: Number(r.totalProduced || 0),
      scrapPercent: r.totalProduced ? (Number(r.totalScrap || 0) / Number(r.totalProduced || 0)) * 100 : 0,
      currentScrap: scrapMap[r.productId]?.scrap || 0
    }));

    res.json({
      rows: output,
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
      const limit = parseInt(req.query.limit || "10", 10);
      return res.json({
        rows: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0 }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Stock report
router.get("/stock/products", async (req, res) => {
  try {
    const { placeType, placeId } = req.query;
    const sortBy = String(req.query.sortBy || "").toLowerCase();
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const useLowStockWiseSort = sortBy === "low_stock_wise";
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const scope = await getScope(req);
    const orderByStock = sortBy === "stock" ? { stock: sortOrder } : undefined;

    if (!placeType) {
      if (!scope.isAdmin) {
        return res.json({
          rows: [],
          pagination: { page, limit, totalCount: 0, totalPages: 0 }
        });
      }
      const rows = await prisma.product.findMany({
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        select: { id: true, name: true, category: true, image: true, stock: true, alert_quantity: true },
        ...(sortBy === "stock" ? { orderBy: { stock: sortOrder } } : {})
      });
      const mappedRows = rows.map(r => ({ ...r, scrap: 0, brand: null, unit: null }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.product.count();
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "store") {
      const storeId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (storeId) ensureIdScope(scope, "store", storeId);
        if (!storeId && scope.stores.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = storeId
        ? { store_id: storeId }
        : scope.isAdmin ? {} : { store_id: { in: Array.from(scope.stores) } };
      const rows = await prisma.storeProduct.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { product: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.product_id,
        name: r.product?.name,
        category: r.product?.category,
        image: r.product?.image,
        stock: r.stock,
        scrap: r.scrap || 0,
        alert_quantity: toNum(r.alert_quantity, toNum(r.product?.alert_quantity, 0)),
        brand: null,
        unit: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.storeProduct.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "shop") {
      const shopId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (shopId) ensureIdScope(scope, "shop", shopId);
        if (!shopId && scope.shops.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = shopId
        ? { shop_id: shopId }
        : scope.isAdmin ? {} : { shop_id: { in: Array.from(scope.shops) } };
      const rows = await prisma.shopProduct.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { product: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.product_id,
        name: r.product?.name,
        category: r.product?.category,
        image: r.product?.image,
        stock: r.stock,
        alert_quantity: toNum(r.alert_quantity, toNum(r.product?.alert_quantity, 0)),
        scrap: r.scrap || 0,
        brand: null,
        unit: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.shopProduct.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "factory") {
      const factoryId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (factoryId) ensureIdScope(scope, "factory", factoryId);
        if (!factoryId && scope.factories.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = factoryId
        ? { factoryId }
        : scope.isAdmin ? {} : { factoryId: { in: Array.from(scope.factories) } };
      const rows = await prisma.factoryProduct.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { product: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.productId,
        name: r.product?.name,
        category: r.product?.category,
        image: r.product?.image,
        stock: r.stock,
        alert_quantity: toNum(r.alert_quantity, toNum(r.product?.alert_quantity, 0)),
        scrap: r.scrap || 0,
        brand: null,
        unit: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.factoryProduct.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    res.status(400).json({ error: "Invalid placeType" });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ count: 0, byStatus: {} });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/stock/materials", async (req, res) => {
  try {
    const { placeType, placeId } = req.query;
    const sortBy = String(req.query.sortBy || "").toLowerCase();
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const useLowStockWiseSort = sortBy === "low_stock_wise";
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const scope = await getScope(req);
    const orderByStock = sortBy === "stock" ? { stock: sortOrder } : undefined;

    if (!placeType) {
      if (!scope.isAdmin) {
        return res.json({
          rows: [],
          pagination: { page, limit, totalCount: 0, totalPages: 0 }
        });
      }
      const rows = await prisma.material.findMany({
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        select: { id: true, name: true, brand: true, category: true, image: true, current_stock: true, unit: true, alert_quantity: true },
        ...(sortBy === "stock" ? { orderBy: { current_stock: sortOrder } } : {})
      });
      const mappedRows = rows.map(r => ({ ...r, stock: r.current_stock, scrap: 0 }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.material.count();
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "store") {
      const storeId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (storeId) ensureIdScope(scope, "store", storeId);
        if (!storeId && scope.stores.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = storeId
        ? { store_id: storeId }
        : scope.isAdmin ? {} : { store_id: { in: Array.from(scope.stores) } };
      const rows = await prisma.storeMaterial.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { material: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.material_id,
        name: r.material?.name,
        brand: r.material?.brand,
        image: r.material?.image,
        stock: r.stock,
        alert_quantity: toNum(r.alert_quantity, toNum(r.material?.alert_quantity, 0)),
        unit: r.material?.unit,
        scrap: r.scrap || 0,
        category: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.storeMaterial.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "shop") {
      const shopId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (shopId) ensureIdScope(scope, "shop", shopId);
        if (!shopId && scope.shops.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = shopId
        ? { shop_id: shopId }
        : scope.isAdmin ? {} : { shop_id: { in: Array.from(scope.shops) } };
      const rows = await prisma.shopMaterial.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { material: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.material_id,
        name: r.material?.name,
        brand: r.material?.brand,
        image: r.material?.image,
        stock: r.stock,
        alert_quantity: toNum(r.alert_quantity, toNum(r.material?.alert_quantity, 0)),
        unit: r.material?.unit,
        scrap: r.scrap || 0,
        category: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.shopMaterial.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    if (placeType === "factory") {
      const factoryId = placeId ? parseInt(placeId) : null;
      if (!scope.isAdmin) {
        if (factoryId) ensureIdScope(scope, "factory", factoryId);
        if (!factoryId && scope.factories.size === 0) {
          return res.json({
            rows: [],
            pagination: { page, limit, totalCount: 0, totalPages: 0 }
          });
        }
      }
      const where = factoryId
        ? { factoryId }
        : scope.isAdmin ? {} : { factoryId: { in: Array.from(scope.factories) } };
      const rows = await prisma.factoryMaterial.findMany({
        where,
        ...(useLowStockWiseSort ? {} : { skip: offset, take: limit }),
        include: { material: true },
        ...(orderByStock ? { orderBy: orderByStock } : {})
      });
      const mappedRows = rows.map(r => ({
        id: r.materialId,
        name: r.material?.name,
        brand: r.material?.brand,
        image: r.material?.image,
        stock: r.stock,
        alert_quantity: toNum(r.alert_quantity, toNum(r.material?.alert_quantity, 0)),
        unit: r.material?.unit,
        scrap: r.scrap || 0,
        category: null
      }));
      if (useLowStockWiseSort) {
        const sorted = sortRowsByLowStockWise(mappedRows, sortOrder);
        return res.json(paginateRows(sorted, page, limit));
      }
      const total = await prisma.factoryMaterial.count({ where });
      return res.json({
        rows: mappedRows,
        pagination: { page, limit, totalCount: total, totalPages: Math.ceil(total / limit) }
      });
    }

    res.status(400).json({ error: "Invalid placeType" });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, profit: 0 });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/wastage", async (req, res) => {
  try {
    const scrapProducts = await prisma.scrapProduct.findMany({ select: { quantity: true } }).catch(() => []);
    const scrapMaterials = await prisma.scrapMaterial.findMany({ select: { quantity: true } }).catch(() => []);
    res.json({
      productScrap: sum(scrapProducts, "quantity"),
      materialScrap: sum(scrapMaterials, "quantity")
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stock", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { stock: true } });
    const materials = await prisma.material.findMany({ select: { current_stock: true } });
    res.json({
      productStock: sum(products, "stock"),
      materialStock: sum(materials, "current_stock")
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer", async (req, res) => {
  try {
    const scope = await getScope(req);
    const transferWhere = buildTransferOrFilter(scope);
    const transfers = await prisma.transfer.findMany({ where: transferWhere, select: { status: true } });
    const byStatus = transfers.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ count: transfers.length, byStatus });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ totalSales: 0, totalPurchases: 0 });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/profit-loss", async (req, res) => {
  try {
    const scope = await getScope(req);
    const sales = await prisma.sale.findMany({ where: buildSaleScopeWhere(scope), select: { grandTotal: true } });
    const purchases = await prisma.purchase.findMany({ where: buildLocationOrFilter(scope), select: { grandTotal: true } });
    const expenses = await prisma.expense.findMany({ select: { amount: true } }).catch(() => []);
    const totalSales = sum(sales, "grandTotal");
    const totalPurchases = sum(purchases, "grandTotal");
    const totalExpenses = sum(expenses, "amount");
    const profit = totalSales - totalPurchases - totalExpenses;
    res.json({ totalSales, totalPurchases, totalExpenses, profit });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchase-sales", async (req, res) => {
  try {
    const scope = await getScope(req);
    const sales = await prisma.sale.findMany({ where: buildSaleScopeWhere(scope), select: { grandTotal: true } });
    const purchases = await prisma.purchase.findMany({ where: buildLocationOrFilter(scope), select: { grandTotal: true } });
    res.json({ totalSales: sum(sales, "grandTotal"), totalPurchases: sum(purchases, "grandTotal") });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/customer", async (req, res) => {
  try {
    const scope = await getScope(req);
    const sales = await prisma.sale.findMany({ where: buildSaleScopeWhere(scope), select: { customer: true, grandTotal: true } });
    const byCustomer = {};
    sales.forEach(s => {
      const key = s.customer || "Walk-in";
      byCustomer[key] = (byCustomer[key] || 0) + (parseFloat(s.grandTotal) || 0);
    });
    const rows = Object.entries(byCustomer).map(([customer, total]) => ({ customer, total }));
    res.json({ rows });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/supplier", async (req, res) => {
  try {
    const scope = await getScope(req);
    const purchases = await prisma.purchase.findMany({
      where: buildLocationOrFilter(scope),
      select: { grandTotal: true, supplier: { select: { name: true } } }
    });
    const bySupplier = {};
    purchases.forEach(p => {
      const key = p.supplier?.name || "Unknown";
      bySupplier[key] = (bySupplier[key] || 0) + (parseFloat(p.grandTotal) || 0);
    });
    const rows = Object.entries(bySupplier).map(([supplier, total]) => ({ supplier, total }));
    res.json({ rows });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/best-selling", async (req, res) => {
  try {
    const sort = (req.query.sort || "best").toLowerCase();
    const scope = await getScope(req);
    const items = await prisma.saleItem.findMany({
      where: { sale: buildSaleScopeWhere(scope) },
      include: { product: true, material: true }
    });
    const byItem = {};
    items.forEach(i => {
      const key = i.productId ? `p-${i.productId}` : `m-${i.materialId}`;
      const name = i.product?.name || i.material?.name || "Unknown";
      if (!byItem[key]) byItem[key] = { name, quantity: 0, total: 0 };
      byItem[key].quantity += parseFloat(i.quantity) || 0;
      byItem[key].total += parseFloat(i.totalPrice) || 0;
    });
    const rows = Object.values(byItem).sort((a, b) => sort === "worst" ? a.quantity - b.quantity : b.quantity - a.quantity);
    res.json({ rows });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/profit-calendar", async (req, res) => {
  try {
    const scope = await getScope(req);
    const sales = await prisma.sale.findMany({ where: buildSaleScopeWhere(scope), select: { grandTotal: true, createdAt: true } });
    const purchases = await prisma.purchase.findMany({ where: buildLocationOrFilter(scope), select: { grandTotal: true, createdAt: true } });
    const expenses = await prisma.expense.findMany({ select: { amount: true, date: true } }).catch(() => []);

    const byMonth = {};
    const addToMonth = (date, key, value) => {
      const d = new Date(date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[m]) byMonth[m] = { sales: 0, purchases: 0, expenses: 0, profit: 0 };
      byMonth[m][key] += value;
    };

    sales.forEach(s => addToMonth(s.createdAt, "sales", parseFloat(s.grandTotal) || 0));
    purchases.forEach(p => addToMonth(p.createdAt, "purchases", parseFloat(p.grandTotal) || 0));
    expenses.forEach(e => addToMonth(e.date, "expenses", parseFloat(e.amount) || 0));

    const rows = Object.entries(byMonth).map(([month, vals]) => ({
      month,
      sales: vals.sales,
      purchases: vals.purchases,
      expenses: vals.expenses,
      profit: vals.sales - vals.purchases - vals.expenses
    }));

    res.json({ rows });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
