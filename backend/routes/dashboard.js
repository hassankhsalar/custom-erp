const express = require("express");
const { PrismaClient, Prisma } = require("@prisma/client");
const { buildScope, ensureHasAnyScope, buildLocationOrFilter, buildTransferOrFilter } = require("../utils/associateScope");
const { on } = require("node-cache");
const prisma = new PrismaClient();
const router = express.Router();

// Get dashboard data
router.get("/", async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const now = new Date();
    
    // Calculate date ranges
    const dateRanges = {
      day: new Date(Date.now() - 24 * 60 * 60 * 1000),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    };

    const startDate = dateRanges[range] || dateRanges.month;
    const durationMs = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - durationMs);

    const userId = req.user?.userId;
    const scope = userId ? await buildScope(prisma, userId) : { isAdmin: true, shops: new Set(), stores: new Set(), factories: new Set() };
    ensureHasAnyScope(scope);

    const saleScopeWhere = buildSaleScopeWhere(scope);
    const purchaseScopeWhere = buildLocationOrFilter(scope);
    const transferScopeWhere = buildTransferOrFilter(scope);

    // Fetch all data in parallel
    const [
      currentSales,
      previousSales,
      currentRevenue,
      previousRevenue,
      inventoryData,
      transfers,
      topProducts,
      lowStockItems,
      recentActivities,
      shopPerformance,
      monthlyRevenue
    ] = await Promise.all([
      // Current period sales count
      prisma.sale.count({
        where: { ...saleScopeWhere, createdAt: { gte: startDate } }
      }),
      // Previous period sales count
      prisma.sale.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          },
          ...saleScopeWhere
        }
      }),
      // Current period revenue
      prisma.sale.aggregate({
        where: { ...saleScopeWhere, createdAt: { gte: startDate } },
        _sum: { grandTotal: true }
      }),
      // Previous period revenue
      prisma.sale.aggregate({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          },
          ...saleScopeWhere
        },
        _sum: { grandTotal: true }
      }),
      // Inventory data
      getInventoryData(scope),
      // Transfer data
      getTransferData(transferScopeWhere),
      // Top products
      getTopProducts(startDate, scope),
      // Low stock items
      getLowStockItems(scope),
      // Recent activities
      getRecentActivities(saleScopeWhere, purchaseScopeWhere, transferScopeWhere),
      // Shop performance (since sales are only in shops)
      getShopPerformance(startDate, scope),
      // Monthly revenue chart data
      getMonthlyRevenue(scope)
    ]);

    // Calculate KPIs with trends
    const salesChange = previousSales > 0 
      ? ((currentSales - previousSales) / previousSales * 100).toFixed(1)
      : currentSales > 0 ? 100 : 0;

    const revenueChange = previousRevenue._sum.grandTotal > 0
      ? ((currentRevenue._sum.grandTotal - previousRevenue._sum.grandTotal) / previousRevenue._sum.grandTotal * 100).toFixed(1)
      : currentRevenue._sum.grandTotal > 0 ? 100 : 0;

    const dashboardData = {
      kpis: {
        revenue: {
          value: `$${formatNumber(currentRevenue._sum.grandTotal || 0)}`,
          change: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
          trend: revenueChange >= 0 ? 'up' : 'down'
        },
        sales: {
          value: currentSales.toString(),
          change: `${salesChange >= 0 ? '+' : ''}${salesChange}%`,
          trend: salesChange >= 0 ? 'up' : 'down'
        },
        inventory: {
          value: `$${formatNumber(inventoryData.totalValue)}`,
          change: '+5.2%',
          trend: 'up'
        },
        transfers: {
          value: transfers.pendingCount.toString(),
          change: '-3',
          trend: 'down'
        }
      },
      sales: {
        monthlyRevenue,
        topProducts
      },
      inventory: {
        byCategory: inventoryData.byCategory,
        lowStock: lowStockItems
      },
      transfers: {
        statusOverview: transfers.statusOverview
      },
      recentActivity: recentActivities,
      performance: {
        shops: shopPerformance
      }
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("Dashboard error:", err);
    if (err.status === 403) {
      return res.json({
        kpis: {
          revenue: { value: "$0", change: "0%", trend: "up" },
          sales: { value: "0", change: "0%", trend: "up" },
          inventory: { value: "$0", change: "0%", trend: "up" },
          transfers: { value: "0", change: "0", trend: "down" }
        },
        sales: { monthlyRevenue: [], topProducts: [] },
        inventory: { byCategory: [], lowStock: [] },
        transfers: { statusOverview: {} },
        recentActivity: [],
        performance: { shops: [] }
      });
    }
    res.status(500).json({ error: err.message });
  }
});

function buildSaleScopeWhere(scope) {
  if (!scope || scope.isAdmin) return {};
  const ors = [];
  if (scope.shops.size > 0) ors.push({ shopId: { in: Array.from(scope.shops) } });
  if (ors.length === 0) {
    return { id: -1 };
  }
  return { OR: ors };
}

function buildIdWhere(scope, field, set) {
  if (!scope || scope.isAdmin) return {};
  if (!set || set.size === 0) return { [field]: -1 };
  return { [field]: { in: Array.from(set) } };
}

// Helper functions
async function getInventoryData(scope) {

  const storeIds = scope?.isAdmin ? null : Array.from(scope?.stores || []);
  const shopIds = scope?.isAdmin ? null : Array.from(scope?.shops || []);
  const factoryIds = scope?.isAdmin ? null : Array.from(scope?.factories || []);

  const sumExpr = Prisma.raw("COALESCE(SUM(stock * COALESCE(avg_cost, 0)), 0) AS total");
  const tableSums = await Promise.all([
    queryInventoryValue("StoreProduct", "store_id", storeIds, sumExpr),
    queryInventoryValue("StoreMaterial", "store_id", storeIds, sumExpr),
    queryInventoryValue("ShopProduct", "shop_id", shopIds, sumExpr),
    queryInventoryValue("ShopMaterial", "shop_id", shopIds, sumExpr),
    queryInventoryValue("FactoryProduct", "factoryId", factoryIds, sumExpr),
    queryInventoryValue("FactoryMaterial", "factoryId", factoryIds, sumExpr),
  ]);

  const totalValue = tableSums.reduce((sum, val) => sum + val, 0);

  const byCategory = [
    { category: 'Construction Materials', value: totalValue * 0.48 },
    { category: 'Metal Products', value: totalValue * 0.35 },
    { category: 'Raw Materials', value: totalValue * 0.17 }
  ];

  return { totalValue, byCategory };
}

async function queryInventoryValue(tableName, idColumn, ids, sumExpr) {
  try {
    if (Array.isArray(ids) && ids.length === 0) return 0;
    const idCol = Prisma.raw(`\`${idColumn}\``);
    const table = Prisma.raw(`\`${tableName}\``);
    const whereClause =
      Array.isArray(ids) && ids.length > 0
        ? Prisma.sql`WHERE ${idCol} IN (${Prisma.join(ids)})`
        : Prisma.empty;
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT ${sumExpr} FROM ${table} ${whereClause}`
    );
    return Number(rows?.[0]?.total || 0);
  } catch (error) {
    console.error(`Inventory aggregate failed for ${tableName}:`, error.message || error);
    return 0;
  }
}

async function getTransferData(transferWhere) {
  const transfers = await prisma.transfer.groupBy({
    by: ['status'],
    where: transferWhere,
    _count: { id: true }
  });

  const statusOverview = {
    processing: 0,
    pending: 0,
    on_the_way: 0,
    complete: 0,
    not_received: 0,
    total: 0
  };

  transfers.forEach(t => {
    statusOverview[t.status] = t._count.id;
    statusOverview.total += t._count.id;
  });

  const pendingCount = statusOverview.pending;

  return { statusOverview, pendingCount };
}

async function getTopProducts(startDate, scope) {
  try {
    if (!scope?.isAdmin && (!scope?.shops || scope.shops.size === 0)) {
      return [];
    }
    const shopFilter = scope?.isAdmin
      ? Prisma.empty
      : Prisma.sql` AND s.shopId IN (${Prisma.join(Array.from(scope.shops))})`;

    const [topProductsRaw, topMaterialsRaw] = await Promise.all([
      prisma.$queryRaw(
        Prisma.sql`
          SELECT
            si.productId AS id,
            COALESCE(SUM(si.quantity), 0) AS sales,
            COALESCE(SUM(si.totalPrice), 0) AS revenue
          FROM \`SaleItem\` si
          INNER JOIN \`Sale\` s ON s.id = si.saleId
          WHERE si.productId IS NOT NULL
            AND s.createdAt >= ${startDate}
            ${shopFilter}
          GROUP BY si.productId
          ORDER BY revenue DESC
          LIMIT 5
        `
      ),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT
            si.materialId AS id,
            COALESCE(SUM(si.quantity), 0) AS sales,
            COALESCE(SUM(si.totalPrice), 0) AS revenue
          FROM \`SaleItem\` si
          INNER JOIN \`Sale\` s ON s.id = si.saleId
          WHERE si.materialId IS NOT NULL
            AND s.createdAt >= ${startDate}
            ${shopFilter}
          GROUP BY si.materialId
          ORDER BY revenue DESC
          LIMIT 5
        `
      )
    ]);

    const productIds = topProductsRaw.map((row) => Number(row.id)).filter(Boolean);
    const materialIds = topMaterialsRaw.map((row) => Number(row.id)).filter(Boolean);
    const [productNames, materialNames] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      materialIds.length
        ? prisma.material.findMany({ where: { id: { in: materialIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);
    const productNameMap = new Map(productNames.map((row) => [row.id, row.name]));
    const materialNameMap = new Map(materialNames.map((row) => [row.id, row.name]));

    const rows = [
      ...topProductsRaw.map((row) => ({
        id: Number(row.id || 0),
        name: productNameMap.get(Number(row.id)) || "Unknown Product",
        sales: Number(row.sales || 0),
        revenue: Number(row.revenue || 0),
      })),
      ...topMaterialsRaw.map((row) => ({
        id: Number(row.id || 0),
        name: materialNameMap.get(Number(row.id)) || "Unknown Material",
        sales: Number(row.sales || 0),
        revenue: Number(row.revenue || 0),
      })),
    ]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return rows;
  } catch (error) {
    console.error("Error in getTopProducts:", error);
    return [];
  }
}

async function getLowStockItems(scope) {
  const storeWhere = buildIdWhere(scope, "store_id", scope?.stores);
  const shopWhere = buildIdWhere(scope, "shop_id", scope?.shops);
  const factoryWhere = buildIdWhere(scope, "factoryId", scope?.factories);

  const [lowStoreProducts, lowStoreMaterials, lowShopProducts, lowShopMaterials, lowFactoryProducts, lowFactoryMaterials] = await Promise.all([
    // Low stock in stores
    prisma.storeProduct.findMany({
      where: { ...storeWhere, stock: { lt: 10 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { product_id: true, stock: true, product: { select: { name: true, alert_quantity: true } }, store: { select: { name: true } } }
    }),
    prisma.storeMaterial.findMany({
      where: { ...storeWhere, stock: { lt: 50 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { material_id: true, stock: true, material: { select: { name: true, alert_quantity: true } }, store: { select: { name: true } } }
    }),
    // Low stock in shops
    prisma.shopProduct.findMany({
      where: { ...shopWhere, stock: { lt: 5 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { product_id: true, stock: true, product: { select: { name: true, alert_quantity: true } }, shop: { select: { name: true } } }
    }),
    prisma.shopMaterial.findMany({
      where: { ...shopWhere, stock: { lt: 25 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { material_id: true, stock: true, material: { select: { name: true, alert_quantity: true } }, shop: { select: { name: true } } }
    }),
    prisma.factoryProduct.findMany({
      where: { ...factoryWhere, stock: { lt: 10 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { productId: true, stock: true, product: { select: { name: true, alert_quantity: true } }, factory: { select: { name: true } } }
    }),
    prisma.factoryMaterial.findMany({
      where: { ...factoryWhere, stock: { lt: 50 } },
      orderBy: { stock: "asc" },
      take: 10,
      select: { materialId: true, stock: true, material: { select: { name: true, alert_quantity: true } }, factory: { select: { name: true } } }
    }),
  ]);

  const lowStockItems = [
    ...lowStoreProducts.map(sp => ({
      id: `store-product-${sp.product_id}`,
      name: sp.product?.name,
      type: 'product',
      location: sp.store?.name,
      current: sp.stock,
      min: sp.product?.alert_quantity || 0
    })),
    ...lowStoreMaterials.map(sm => ({
      id: `store-material-${sm.material_id}`,
      name: sm.material?.name,
      type: 'material',
      location: sm.store?.name,
      current: sm.stock,
      min: sm.material?.alert_quantity || 0
    })),
    ...lowShopProducts.map(sp => ({
      id: `shop-product-${sp.product_id}`,
      name: sp.product?.name,
      type: 'product',
      location: sp.shop?.name,
      current: sp.stock,
      min: sp.product?.alert_quantity || 0
    })),
    ...lowShopMaterials.map(sm => ({
      id: `shop-material-${sm.material_id}`,
      name: sm.material?.name,
      type: 'material',
      location: sm.shop?.name,
      current: sm.stock,
      min: sm.material?.alert_quantity || 0
    })),
    ...lowFactoryProducts.map(fp => ({
      id: `factory-product-${fp.productId}`,
      name: fp.product?.name,
      type: 'product',
      location: fp.factory?.name,
      current: fp.stock,
      min: fp.product?.alert_quantity || 0
    })),
    ...lowFactoryMaterials.map(fm => ({
      id: `factory-material-${fm.materialId}`,
      name: fm.material?.name,
      type: 'material',
      location: fm.factory?.name,
      current: fm.stock,
      min: fm.material?.alert_quantity || 0
    }))
  ];

  return lowStockItems
    .sort((a, b) => Number(a.current || 0) - Number(b.current || 0))
    .slice(0, 5);
}

async function getRecentActivities(saleScopeWhere, purchaseScopeWhere, transferScopeWhere) {
  const [recentSales, recentTransfers, recentPurchases] = await Promise.all([
    prisma.sale.findMany({
      where: saleScopeWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        grandTotal: true,
        shop: { select: { name: true } },
      }
    }),
    prisma.transfer.findMany({
      where: transferScopeWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        reference: true,
      }
    }),

    prisma.purchase.findMany({
      where: purchaseScopeWhere,
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, grandTotal: true, supplier: { select: { name: true } } }
    })
  ]);

  const activities = [
    ...recentSales.map(sale => ({
      type: 'sale',
      description: `Sale at ${sale.shop?.name || 'Unknown Shop'}`,
      amount: sale.grandTotal,
      time: formatTimeAgo(sale.createdAt),
      timestamp: sale.createdAt,
    })),
    ...recentTransfers.map(transfer => ({
      type: 'transfer',
      description: `Transfer ${transfer.reference}`,
      amount: 0,
      time: formatTimeAgo(transfer.createdAt),
      timestamp: transfer.createdAt,
    })),
    ...recentPurchases.map(purchase => ({
      type: 'purchase',
      description: `Purchase from ${purchase.supplier?.name}`,
      amount: purchase.grandTotal,
      time: formatTimeAgo(purchase.createdAt),
      timestamp: purchase.createdAt,
    }))
  ];

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)
    .map(({ timestamp, ...rest }) => rest);
}

async function getShopPerformance(startDate, scope) {
  try {
    if (!scope?.isAdmin && scope.shops.size === 0) {
      return [];
    }
    const shopFilter = scope?.isAdmin
      ? Prisma.empty
      : Prisma.sql` AND s.shopId IN (${Prisma.join(Array.from(scope.shops))})`;
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          s.shopId AS id,
          COALESCE(sh.name, 'Unknown Shop') AS name,
          COUNT(*) AS sales,
          COALESCE(SUM(s.grandTotal), 0) AS revenue
        FROM \`Sale\` s
        LEFT JOIN \`Shop\` sh ON sh.id = s.shopId
        WHERE s.shopId IS NOT NULL
          AND s.createdAt >= ${startDate}
          ${shopFilter}
        GROUP BY s.shopId, sh.name
        ORDER BY revenue DESC
      `
    );

    return rows.map((row) => ({
      id: Number(row.id || 0),
      name: row.name || "Unknown Shop",
      sales: Number(row.sales || 0),
      revenue: Number(row.revenue || 0),
      efficiency: Math.floor(Math.random() * 10) + 85,
    }));
  } catch (error) {
    console.error("Error in getShopPerformance:", error);
    return [];
  }
}

async function getMonthlyRevenue(scope) {
  try {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const endDate = now;
    if (!scope?.isAdmin && (!scope?.shops || scope.shops.size === 0)) {
      return buildEmptyMonthlySeries(startMonth);
    }

    const table = Prisma.raw("`Sale`");
    const scopedRows = scope?.isAdmin
      ? await prisma.$queryRaw(
          Prisma.sql`
            SELECT DATE_FORMAT(createdAt, '%Y-%m') AS ym,
                   COALESCE(SUM(grandTotal), 0) AS revenue,
                   COUNT(*) AS sales
            FROM ${table}
            WHERE createdAt >= ${startMonth} AND createdAt <= ${endDate}
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
          `
        )
      : await prisma.$queryRaw(
          Prisma.sql`
            SELECT DATE_FORMAT(createdAt, '%Y-%m') AS ym,
                   COALESCE(SUM(grandTotal), 0) AS revenue,
                   COUNT(*) AS sales
            FROM ${table}
            WHERE createdAt >= ${startMonth}
              AND createdAt <= ${endDate}
              AND shopId IN (${Prisma.join(Array.from(scope.shops))})
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
          `
        );
    const monthlyData = new Map(
      scopedRows.map((row) => [row.ym, { revenue: Number(row.revenue || 0), sales: Number(row.sales || 0) }])
    );

    const months = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyData.get(key);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: entry?.revenue || 0,
        sales: entry?.sales || 0
      });
    }

    return months;
  } catch (error) {
    console.error("Error in getMonthlyRevenue:", error);
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return buildEmptyMonthlySeries(startMonth);
  }
}

function buildEmptyMonthlySeries(startMonth) {
  const fallbackMonths = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    fallbackMonths.push({
      month: d.toLocaleString('default', { month: 'short' }),
      revenue: 0,
      sales: 0
    });
  }
  return fallbackMonths;
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

module.exports = router;
