const express = require("express");
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureHasAnyScope } = require("../utils/associateScope");

const parseDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  return { start, end };
};

const buildTransferScopeSql = (scope) => {
  if (scope.isAdmin) return Prisma.sql`1=1`;
  const clauses = [];
  const shopIds = Array.from(scope.shops || []);
  const storeIds = Array.from(scope.stores || []);
  const factoryIds = Array.from(scope.factories || []);
  if (shopIds.length) {
    clauses.push(Prisma.sql`(t.\`from\` = 'shop' AND t.\`fromId\` IN (${Prisma.join(shopIds)}))`);
    clauses.push(Prisma.sql`(t.\`to\` = 'shop' AND t.\`toId\` IN (${Prisma.join(shopIds)}))`);
  }
  if (storeIds.length) {
    clauses.push(Prisma.sql`(t.\`from\` = 'store' AND t.\`fromId\` IN (${Prisma.join(storeIds)}))`);
    clauses.push(Prisma.sql`(t.\`to\` = 'store' AND t.\`toId\` IN (${Prisma.join(storeIds)}))`);
  }
  if (factoryIds.length) {
    clauses.push(Prisma.sql`(t.\`from\` = 'factory' AND t.\`fromId\` IN (${Prisma.join(factoryIds)}))`);
    clauses.push(Prisma.sql`(t.\`to\` = 'factory' AND t.\`toId\` IN (${Prisma.join(factoryIds)}))`);
  }
  if (!clauses.length) return Prisma.sql`1=0`;
  return Prisma.sql`(${Prisma.join(clauses, Prisma.sql` OR `)})`;
};

router.get("/cash-bank/details", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const saleDateClause = start && end
      ? Prisma.sql`AND s.createdAt >= ${start} AND s.createdAt <= ${end}`
      : Prisma.sql``;

    const txnDateClause = start && end
      ? Prisma.sql`AND t.createdAt >= ${start} AND t.createdAt <= ${end}`
      : Prisma.sql``;

    const cashStatsRows = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT t.saleId) as saleCount,
             SUM(t.amount) as saleAmount
      FROM \`Transactions\` t
      JOIN \`Sale\` s ON s.id = t.saleId
      WHERE t.saleId IS NOT NULL
        AND (t.payment_method = 'cash' OR t.cashRegisterId IS NOT NULL)
        AND t.added_to_account = 1
      ${txnDateClause}
      ${saleDateClause}
    `;

    const cashRegisters = await prisma.cashRegister.findMany({
      where: { deleted_at: false },
      select: { id: true, name: true, cash_in_hand: true, status: true }
    });

    const bankSummaryRows = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT CASE WHEN t.saleId IS NOT NULL THEN t.saleId END) as saleCount,
        SUM(CASE WHEN t.saleId IS NOT NULL THEN t.amount ELSE 0 END) as saleAmount,
        COUNT(DISTINCT CASE WHEN t.purchaseId IS NOT NULL THEN t.purchaseId END) as purchaseCount,
        SUM(CASE WHEN t.purchaseId IS NOT NULL THEN t.amount ELSE 0 END) as purchaseAmount
      FROM \`Transactions\` t
      WHERE t.bankAccountId IS NOT NULL
      ${txnDateClause}
    `;

    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const totalBanks = await prisma.bankAccount.count({ where: { deleted_at: false } });
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { deleted_at: false },
      skip: offset,
      take: limit,
      select: { id: true, name: true, account_number: true, withdraw_charge: true, current_balance: true }
    });

    const bankAggRows = await prisma.$queryRaw`
      SELECT 
        t.bankAccountId,
        SUM(CASE WHEN t.added_to_account = 1 THEN t.amount ELSE 0 END) as totalReceive,
        SUM(CASE WHEN t.added_to_account = 0 THEN t.amount ELSE 0 END) as totalPaid,
        COUNT(CASE WHEN t.added_to_account = 1 AND t.saleId IS NOT NULL THEN 1 END) as receiveCount,
        COUNT(CASE WHEN t.added_to_account = 0 AND t.purchaseId IS NOT NULL THEN 1 END) as paidCount
      FROM \`Transactions\` t
      WHERE t.bankAccountId IS NOT NULL
      ${txnDateClause}
      GROUP BY t.bankAccountId
    `;

    const bankAggMap = {};
    bankAggRows.forEach(r => {
      bankAggMap[r.bankAccountId] = r;
    });

    const bankRows = bankAccounts.map(b => {
      const agg = bankAggMap[b.id] || {};
      const totalReceive = Number(agg.totalReceive || 0);
      const withdrawCharge = Number(b.withdraw_charge || 0);
      const withdrawable = withdrawCharge > 0
        ? totalReceive - (totalReceive * withdrawCharge / 100)
        : totalReceive;
      return {
        id: b.id,
        name: b.name,
        account_number: b.account_number,
        current_balance: b.current_balance,
        receiveCount: Number(agg.receiveCount || 0),
        paidCount: Number(agg.paidCount || 0),
        totalReceive,
        totalPaid: Number(agg.totalPaid || 0),
        totalWithdrawable: withdrawable
      };
    });

    res.json({
      cash: {
        saleCount: Number(cashStatsRows[0]?.saleCount || 0),
        saleAmount: Number(cashStatsRows[0]?.saleAmount || 0),
        cashRegisters
      },
      bank: {
        saleCount: Number(bankSummaryRows[0]?.saleCount || 0),
        saleAmount: Number(bankSummaryRows[0]?.saleAmount || 0),
        purchaseCount: Number(bankSummaryRows[0]?.purchaseCount || 0),
        purchaseAmount: Number(bankSummaryRows[0]?.purchaseAmount || 0),
        rows: bankRows,
        pagination: { page, limit, totalCount: Number(totalBanks || 0), totalPages: Math.ceil(totalBanks / limit) }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/purchase-sales/details", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const purchaseDateClause = start && end
      ? Prisma.sql`AND pu.createdAt >= ${start} AND pu.createdAt <= ${end}`
      : Prisma.sql``;

    const saleDateClause = start && end
      ? Prisma.sql`AND s.createdAt >= ${start} AND s.createdAt <= ${end}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT itemType, itemId FROM (
          SELECT 'product' as itemType, p.id as itemId
          FROM \`PurchaseItem\` pi
          JOIN \`Purchase\` pu ON pu.id = pi.purchaseId
          JOIN \`Product\` p ON p.id = pi.productId
          WHERE pi.productId IS NOT NULL
            AND p.deleted_at = 0
          ${purchaseDateClause}
          GROUP BY p.id
          UNION
          SELECT 'product' as itemType, p.id as itemId
          FROM \`SaleItem\` si
          JOIN \`Sale\` s ON s.id = si.saleId
          JOIN \`Product\` p ON p.id = si.productId
          WHERE si.productId IS NOT NULL
            AND p.deleted_at = 0
          ${saleDateClause}
          GROUP BY p.id
          UNION
          SELECT 'material' as itemType, m.id as itemId
          FROM \`PurchaseItem\` pi
          JOIN \`Purchase\` pu ON pu.id = pi.purchaseId
          JOIN \`Material\` m ON m.id = pi.materialId
          WHERE pi.materialId IS NOT NULL
            AND m.deleted_at = 0
          ${purchaseDateClause}
          GROUP BY m.id
          UNION
          SELECT 'material' as itemType, m.id as itemId
          FROM \`SaleItem\` si
          JOIN \`Sale\` s ON s.id = si.saleId
          JOIN \`Material\` m ON m.id = si.materialId
          WHERE si.materialId IS NOT NULL
            AND m.deleted_at = 0
          ${saleDateClause}
          GROUP BY m.id
        ) t
        GROUP BY itemType, itemId
      ) x
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT itemType, itemId, name, category, image,
             SUM(purchaseQty) as purchaseQty,
             SUM(purchaseAmount) as purchaseAmount,
             SUM(saleQty) as saleQty,
             SUM(saleAmount) as saleAmount
      FROM (
        SELECT 'product' as itemType, p.id as itemId, p.name, p.category, p.image,
               SUM(pi.quantity) as purchaseQty, SUM(pi.totalPrice) as purchaseAmount,
               0 as saleQty, 0 as saleAmount
        FROM \`PurchaseItem\` pi
        JOIN \`Purchase\` pu ON pu.id = pi.purchaseId
        JOIN \`Product\` p ON p.id = pi.productId
        WHERE pi.productId IS NOT NULL
          AND p.deleted_at = 0
        ${purchaseDateClause}
        GROUP BY p.id
        UNION ALL
        SELECT 'product' as itemType, p.id as itemId, p.name, p.category, p.image,
               0 as purchaseQty, 0 as purchaseAmount,
               SUM(si.quantity) as saleQty, SUM(si.totalPrice) as saleAmount
        FROM \`SaleItem\` si
        JOIN \`Sale\` s ON s.id = si.saleId
        JOIN \`Product\` p ON p.id = si.productId
        WHERE si.productId IS NOT NULL
          AND p.deleted_at = 0
        ${saleDateClause}
        GROUP BY p.id
        UNION ALL
        SELECT 'material' as itemType, m.id as itemId, m.name, m.brand as category, m.image,
               SUM(pi.quantity) as purchaseQty, SUM(pi.totalPrice) as purchaseAmount,
               0 as saleQty, 0 as saleAmount
        FROM \`PurchaseItem\` pi
        JOIN \`Purchase\` pu ON pu.id = pi.purchaseId
        JOIN \`Material\` m ON m.id = pi.materialId
        WHERE pi.materialId IS NOT NULL
          AND m.deleted_at = 0
        ${purchaseDateClause}
        GROUP BY m.id
        UNION ALL
        SELECT 'material' as itemType, m.id as itemId, m.name, m.brand as category, m.image,
               0 as purchaseQty, 0 as purchaseAmount,
               SUM(si.quantity) as saleQty, SUM(si.totalPrice) as saleAmount
        FROM \`SaleItem\` si
        JOIN \`Sale\` s ON s.id = si.saleId
        JOIN \`Material\` m ON m.id = si.materialId
        WHERE si.materialId IS NOT NULL
          AND m.deleted_at = 0
        ${saleDateClause}
        GROUP BY m.id
      ) t
      GROUP BY itemType, itemId, name, category, image
      ORDER BY saleAmount DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        purchaseQty: Number(r.purchaseQty || 0),
        purchaseAmount: Number(r.purchaseAmount || 0),
        saleQty: Number(r.saleQty || 0),
        saleAmount: Number(r.saleAmount || 0),
        profit: Number(r.saleAmount || 0) - Number(r.purchaseAmount || 0)
      })),
      pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customer/details", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const saleDateClause = start && end
      ? Prisma.sql`AND s.createdAt >= ${start} AND s.createdAt <= ${end}`
      : Prisma.sql``;

    const totalCount = await prisma.customer.count({ where: { deleted_at: false } });

    const rows = await prisma.$queryRaw`
      SELECT c.id, c.name, c.mobile, c.email,
             COALESCE(agg.totalAmount, 0) as totalAmount,
             COALESCE(agg.totalPaid, 0) as totalPaid,
             COALESCE(agg.totalDue, 0) as totalDue,
             COALESCE(agg.totalItemQty, 0) as totalItemQty,
             COALESCE(agg.itemTypeCount, 0) as itemTypeCount
      FROM \`Customer\` c
      LEFT JOIN (
        SELECT s.customerId,
               SUM(s.grandTotal) as totalAmount,
               SUM(s.paidAmount) as totalPaid,
               SUM(s.grandTotal - s.paidAmount) as totalDue,
               SUM(si.quantity) as totalItemQty,
               COUNT(DISTINCT COALESCE(si.productId, si.materialId)) as itemTypeCount
        FROM \`Sale\` s
        LEFT JOIN \`SaleItem\` si ON si.saleId = s.id
        WHERE s.customerId IS NOT NULL
        ${saleDateClause}
        GROUP BY s.customerId
      ) agg ON agg.customerId = c.id
      WHERE c.deleted_at = 0
      ORDER BY c.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount || 0),
        totalPaid: Number(r.totalPaid || 0),
        totalDue: Number(r.totalDue || 0),
        totalItemQty: Number(r.totalItemQty || 0),
        itemTypeCount: Number(r.itemTypeCount || 0)
      })),
      pagination: { page, limit, totalCount: Number(totalCount || 0), totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/supplier/details", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const purchaseDateClause = start && end
      ? Prisma.sql`AND p.createdAt >= ${start} AND p.createdAt <= ${end}`
      : Prisma.sql``;

    const totalCount = await prisma.supplier.count({ where: { deleted_at: false } });

    const rows = await prisma.$queryRaw`
      SELECT s.id, s.name, s.mobile,
             COALESCE(agg.totalAmount, 0) as totalAmount,
             COALESCE(agg.totalPaid, 0) as totalPaid,
             COALESCE(agg.totalDue, 0) as totalDue,
             COALESCE(agg.totalItemQty, 0) as totalItemQty,
             COALESCE(agg.itemTypeCount, 0) as itemTypeCount
      FROM \`Supplier\` s
      LEFT JOIN (
        SELECT p.supplierId,
               SUM(p.grandTotal) as totalAmount,
               SUM(p.paidAmount) as totalPaid,
               SUM(p.grandTotal - p.paidAmount) as totalDue,
               SUM(pi.quantity) as totalItemQty,
               COUNT(DISTINCT COALESCE(pi.productId, pi.materialId)) as itemTypeCount
        FROM \`Purchase\` p
        LEFT JOIN \`PurchaseItem\` pi ON pi.purchaseId = p.id
        WHERE p.supplierId IS NOT NULL
        ${purchaseDateClause}
        GROUP BY p.supplierId
      ) agg ON agg.supplierId = s.id
      WHERE s.deleted_at = 0
      ORDER BY s.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount || 0),
        totalPaid: Number(r.totalPaid || 0),
        totalDue: Number(r.totalDue || 0),
        totalItemQty: Number(r.totalItemQty || 0),
        itemTypeCount: Number(r.itemTypeCount || 0)
      })),
      pagination: { page, limit, totalCount: Number(totalCount || 0), totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/best-selling/details", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const sortBy = (req.query.sortBy || "amount").toLowerCase();
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const saleDateClause = start && end
      ? Prisma.sql`AND s.createdAt >= ${start} AND s.createdAt <= ${end}`
      : Prisma.sql``;

    const sortColumn = sortBy === "quantity"
      ? "totalQty"
      : sortBy === "profit"
        ? "totalProfit"
        : "totalAmount";

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT itemType, itemId FROM (
          SELECT 'product' as itemType, p.id as itemId
          FROM \`SaleItem\` si
          JOIN \`Sale\` s ON s.id = si.saleId
          JOIN \`Product\` p ON p.id = si.productId
          WHERE si.productId IS NOT NULL
            AND p.deleted_at = 0
          ${saleDateClause}
          GROUP BY p.id
          UNION
          SELECT 'material' as itemType, m.id as itemId
          FROM \`SaleItem\` si
          JOIN \`Sale\` s ON s.id = si.saleId
          JOIN \`Material\` m ON m.id = si.materialId
          WHERE si.materialId IS NOT NULL
            AND m.deleted_at = 0
          ${saleDateClause}
          GROUP BY m.id
        ) t
        GROUP BY itemType, itemId
      ) x
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT itemType, itemId, name, category, image,
             SUM(quantity) as totalQty,
             SUM(totalPrice) as totalAmount,
             SUM(totalPrice - (costPerUnit * quantity)) as totalProfit
      FROM (
        SELECT 'product' as itemType, p.id as itemId, p.name, p.category, p.image,
               si.quantity, si.totalPrice,
               COALESCE(si.avg_cost, p.cost, 0) as costPerUnit
        FROM \`SaleItem\` si
        JOIN \`Sale\` s ON s.id = si.saleId
        JOIN \`Product\` p ON p.id = si.productId
        WHERE si.productId IS NOT NULL
          AND p.deleted_at = 0
        ${saleDateClause}
        UNION ALL
        SELECT 'material' as itemType, m.id as itemId, m.name, m.brand as category, m.image,
               si.quantity, si.totalPrice,
               COALESCE(si.avg_cost, m.unit_cost, 0) as costPerUnit
        FROM \`SaleItem\` si
        JOIN \`Sale\` s ON s.id = si.saleId
        JOIN \`Material\` m ON m.id = si.materialId
        WHERE si.materialId IS NOT NULL
          AND m.deleted_at = 0
        ${saleDateClause}
      ) t
      GROUP BY itemType, itemId, name, category, image
      ORDER BY ${Prisma.raw(sortColumn)} ${Prisma.raw(order)}
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        totalQty: Number(r.totalQty || 0),
        totalAmount: Number(r.totalAmount || 0),
        totalProfit: Number(r.totalProfit || 0)
      })),
      pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer/overview", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);
    const scopeSql = buildTransferScopeSql(scope);
    const dateClause = start && end
      ? Prisma.sql`AND t.createdAt >= ${start} AND t.createdAt <= ${end}`
      : Prisma.sql``;

    const statusRows = await prisma.$queryRaw`
      SELECT t.status, COUNT(*) as count
      FROM \`Transfer\` t
      WHERE 1=1 AND ${scopeSql}
      ${dateClause}
      GROUP BY t.status
    `;
    const totalCount = statusRows.reduce((s, r) => s + Number(r.count || 0), 0);

    const fetchPlaces = async (type) => {
      if (type === "shop") return prisma.shop.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
      if (type === "store") return prisma.store.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
      return prisma.factory.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    };

    const buildGroup = async (direction, type) => {
      const places = await fetchPlaces(type);
      const directionCol = direction === "from" ? "`from`" : "`to`";
      const directionIdCol = direction === "from" ? "`fromId`" : "`toId`";
      const rows = await prisma.$queryRaw`
        SELECT ${Prisma.raw(directionIdCol)} as placeId,
               status,
               COUNT(*) as count
        FROM \`Transfer\` t
        WHERE ${Prisma.raw(directionCol)} = ${type}
          AND ${scopeSql}
        ${dateClause}
        GROUP BY ${Prisma.raw(directionIdCol)}, status
      `;
      const map = {};
      rows.forEach(r => {
        if (!map[r.placeId]) map[r.placeId] = { total: 0, byStatus: {} };
        map[r.placeId].byStatus[r.status] = Number(r.count || 0);
        map[r.placeId].total += Number(r.count || 0);
      });
      return places.map(p => ({
        id: p.id,
        name: p.name,
        total: map[p.id]?.total || 0,
        byStatus: map[p.id]?.byStatus || {}
      }));
    };

    const [fromShops, fromStores, fromFactories, toShops, toStores, toFactories] = await Promise.all([
      buildGroup("from", "shop"),
      buildGroup("from", "store"),
      buildGroup("from", "factory"),
      buildGroup("to", "shop"),
      buildGroup("to", "store"),
      buildGroup("to", "factory")
    ]);

    res.json({
      totalCount,
      byStatus: statusRows.reduce((acc, r) => {
        acc[r.status] = Number(r.count || 0);
        return acc;
      }, {}),
      from: { shops: fromShops, stores: fromStores, factories: fromFactories },
      to: { shops: toShops, stores: toStores, factories: toFactories }
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({
        totalCount: 0,
        byStatus: {},
        from: { shops: [], stores: [], factories: [] },
        to: { shops: [], stores: [], factories: [] }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer/top-sender", async (req, res) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);
    const scopeSql = buildTransferScopeSql(scope);
    const dateClause = start && end
      ? Prisma.sql`AND t.createdAt >= ${start} AND t.createdAt <= ${end}`
      : Prisma.sql``;
    const orderColumn = (mode || "transfer") === "product" ? "totalItems" : "totalTransfers";

    const rows = await prisma.$queryRaw`
      SELECT t.\`from\` as placeType,
             t.\`fromId\` as placeId,
             COUNT(DISTINCT t.id) as totalTransfers,
             SUM(t.shipping_cost) as totalShippingCost,
             SUM(ti.quantity) as totalItems,
             COUNT(DISTINCT CONCAT(IFNULL(ti.productId,''),'-',IFNULL(ti.materialId,''),'-',ti.item)) as itemTypeCount
      FROM \`Transfer\` t
      LEFT JOIN \`TransferItem\` ti ON ti.transferId = t.id
      WHERE 1=1 AND ${scopeSql}
      ${dateClause}
      GROUP BY t.\`from\`, t.\`fromId\`
      ORDER BY ${Prisma.raw(orderColumn)} DESC
    `;

    const shops = await prisma.shop.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const stores = await prisma.store.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const factories = await prisma.factory.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const nameMap = {};
    shops.forEach(s => { nameMap[`shop-${s.id}`] = s.name; });
    stores.forEach(s => { nameMap[`store-${s.id}`] = s.name; });
    factories.forEach(f => { nameMap[`factory-${f.id}`] = f.name; });

    res.json({
      rows: rows
        .filter((r) => !!nameMap[`${r.placeType}-${r.placeId}`])
        .map(r => ({
        placeType: r.placeType,
        placeId: r.placeId,
        placeName: nameMap[`${r.placeType}-${r.placeId}`] || "Unknown",
        totalTransfers: Number(r.totalTransfers || 0),
        totalItems: Number(r.totalItems || 0),
        itemTypeCount: Number(r.itemTypeCount || 0),
        totalShippingCost: Number(r.totalShippingCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer/top-receiver", async (req, res) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);
    const scopeSql = buildTransferScopeSql(scope);
    const dateClause = start && end
      ? Prisma.sql`AND t.createdAt >= ${start} AND t.createdAt <= ${end}`
      : Prisma.sql``;
    const orderColumn = (mode || "transfer") === "product" ? "totalItems" : "totalTransfers";

    const rows = await prisma.$queryRaw`
      SELECT t.\`to\` as placeType,
             t.\`toId\` as placeId,
             COUNT(DISTINCT t.id) as totalTransfers,
             SUM(t.shipping_cost) as totalShippingCost,
             SUM(ti.quantity) as totalItems,
             COUNT(DISTINCT CONCAT(IFNULL(ti.productId,''),'-',IFNULL(ti.materialId,''),'-',ti.item)) as itemTypeCount
      FROM \`Transfer\` t
      LEFT JOIN \`TransferItem\` ti ON ti.transferId = t.id
      WHERE 1=1 AND ${scopeSql}
      ${dateClause}
      GROUP BY t.\`to\`, t.\`toId\`
      ORDER BY ${Prisma.raw(orderColumn)} DESC
    `;

    const shops = await prisma.shop.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const stores = await prisma.store.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const factories = await prisma.factory.findMany({ where: { deleted_at: false }, select: { id: true, name: true } });
    const nameMap = {};
    shops.forEach(s => { nameMap[`shop-${s.id}`] = s.name; });
    stores.forEach(s => { nameMap[`store-${s.id}`] = s.name; });
    factories.forEach(f => { nameMap[`factory-${f.id}`] = f.name; });

    res.json({
      rows: rows
        .filter((r) => !!nameMap[`${r.placeType}-${r.placeId}`])
        .map(r => ({
        placeType: r.placeType,
        placeId: r.placeId,
        placeName: nameMap[`${r.placeType}-${r.placeId}`] || "Unknown",
        totalTransfers: Number(r.totalTransfers || 0),
        totalItems: Number(r.totalItems || 0),
        itemTypeCount: Number(r.itemTypeCount || 0),
        totalShippingCost: Number(r.totalShippingCost || 0)
      }))
    });
  } catch (err) {
    if (err.status === 403) {
      return res.json({ rows: [] });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/transfer/top-items", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureHasAnyScope(scope);
    const scopeSql = buildTransferScopeSql(scope);
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    const dateClause = start && end
      ? Prisma.sql`AND t.createdAt >= ${start} AND t.createdAt <= ${end}`
      : Prisma.sql``;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT COALESCE(ti.productId, ti.materialId) as itemId, ti.item
        FROM \`TransferItem\` ti
        JOIN \`Transfer\` t ON t.id = ti.transferId
        WHERE (ti.productId IS NOT NULL OR ti.materialId IS NOT NULL)
          AND (
            (ti.productId IS NOT NULL AND ti.productId IN (SELECT id FROM \`Product\` WHERE deleted_at = 0))
            OR
            (ti.materialId IS NOT NULL AND ti.materialId IN (SELECT id FROM \`Material\` WHERE deleted_at = 0))
          )
          AND ${scopeSql}
        ${dateClause}
        GROUP BY COALESCE(ti.productId, ti.materialId), ti.item
      ) x
    `;
    const totalCount = Number(totalRows[0]?.count || 0);

    const rows = await prisma.$queryRaw`
      SELECT itemType, itemId, name, category, image, unit, SUM(quantity) as totalQty
      FROM (
        SELECT 'product' as itemType, p.id as itemId, p.name, p.category, p.image, '' as unit, ti.quantity
        FROM \`TransferItem\` ti
        JOIN \`Transfer\` t ON t.id = ti.transferId
        JOIN \`Product\` p ON p.id = ti.productId
        WHERE ti.productId IS NOT NULL AND p.deleted_at = 0 AND ${scopeSql}
        ${dateClause}
        UNION ALL
        SELECT 'material' as itemType, m.id as itemId, m.name, m.brand as category, m.image, m.unit as unit, ti.quantity
        FROM \`TransferItem\` ti
        JOIN \`Transfer\` t ON t.id = ti.transferId
        JOIN \`Material\` m ON m.id = ti.materialId
        WHERE ti.materialId IS NOT NULL AND m.deleted_at = 0 AND ${scopeSql}
        ${dateClause}
      ) t
      GROUP BY itemType, itemId, name, category, image, unit
      ORDER BY totalQty DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      rows: rows.map(r => ({
        ...r,
        totalQty: Number(r.totalQty || 0)
      })),
      pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
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

module.exports = router;
