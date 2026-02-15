const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const REPORT_DIR = path.join(process.cwd(), "uploads", "daily-stock-reports");

const ensureDir = () => {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toDateOnly = (d = new Date()) => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const buildRows = async () => {
  const [storeRows, shopRows, factoryRows, storeMatRows, shopMatRows, factoryMatRows] = await Promise.all([
    prisma.storeProduct.findMany({ include: { store: true, product: true } }),
    prisma.shopProduct.findMany({ include: { shop: true, product: true } }),
    prisma.factoryProduct.findMany({ include: { factory: true, product: true } }),
    prisma.storeMaterial.findMany({ include: { store: true, material: true } }),
    prisma.shopMaterial.findMany({ include: { shop: true, material: true } }),
    prisma.factoryMaterial.findMany({ include: { factory: true, material: true } }),
  ]);

  const rows = [];

  storeRows.forEach((r) => {
    rows.push({
      placeType: "store",
      placeId: r.store_id,
      placeName: r.store?.name || `Store#${r.store_id}`,
      itemType: "product",
      itemId: r.product_id,
      itemName: r.product?.name || `Product#${r.product_id}`,
      unit: null,
      category: r.product?.category || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  shopRows.forEach((r) => {
    rows.push({
      placeType: "shop",
      placeId: r.shop_id,
      placeName: r.shop?.name || `Shop#${r.shop_id}`,
      itemType: "product",
      itemId: r.product_id,
      itemName: r.product?.name || `Product#${r.product_id}`,
      unit: null,
      category: r.product?.category || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  factoryRows.forEach((r) => {
    rows.push({
      placeType: "factory",
      placeId: r.factoryId,
      placeName: r.factory?.name || `Factory#${r.factoryId}`,
      itemType: "product",
      itemId: r.productId,
      itemName: r.product?.name || `Product#${r.productId}`,
      unit: null,
      category: r.product?.category || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  storeMatRows.forEach((r) => {
    rows.push({
      placeType: "store",
      placeId: r.store_id,
      placeName: r.store?.name || `Store#${r.store_id}`,
      itemType: "material",
      itemId: r.material_id,
      itemName: r.material?.name || `Material#${r.material_id}`,
      unit: r.material?.unit || null,
      category: r.material?.brand || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  shopMatRows.forEach((r) => {
    rows.push({
      placeType: "shop",
      placeId: r.shop_id,
      placeName: r.shop?.name || `Shop#${r.shop_id}`,
      itemType: "material",
      itemId: r.material_id,
      itemName: r.material?.name || `Material#${r.material_id}`,
      unit: r.material?.unit || null,
      category: r.material?.brand || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  factoryMatRows.forEach((r) => {
    rows.push({
      placeType: "factory",
      placeId: r.factoryId,
      placeName: r.factory?.name || `Factory#${r.factoryId}`,
      itemType: "material",
      itemId: r.materialId,
      itemName: r.material?.name || `Material#${r.materialId}`,
      unit: r.material?.unit || null,
      category: r.material?.brand || null,
      stock: parseFloat(r.stock) || 0,
      avgCost: r.avg_cost ?? null,
      scrap: r.scrap ?? 0,
    });
  });

  return rows;
};

const writeCsv = (snapshotDate, rows) => {
  ensureDir();
  const yyyy = snapshotDate.getFullYear();
  const mm = String(snapshotDate.getMonth() + 1).padStart(2, "0");
  const dd = String(snapshotDate.getDate()).padStart(2, "0");
  const fileName = `daily-stock-${yyyy}-${mm}-${dd}.csv`;
  const abs = path.join(REPORT_DIR, fileName);

  const header = [
    "snapshotDate",
    "placeType",
    "placeId",
    "placeName",
    "itemType",
    "itemId",
    "itemName",
    "unit",
    "category",
    "stock",
    "avgCost",
    "scrap",
  ];

  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        `${yyyy}-${mm}-${dd}`,
        r.placeType,
        r.placeId,
        r.placeName,
        r.itemType,
        r.itemId,
        r.itemName,
        r.unit || "",
        r.category || "",
        r.stock,
        r.avgCost ?? "",
        r.scrap ?? 0,
      ]
        .map(csvEscape)
        .join(",")
    );
  });

  fs.writeFileSync(abs, lines.join("\n"), "utf8");
  return `/uploads/daily-stock-reports/${fileName}`;
};

const runDailyStockSnapshot = async (dateInput = new Date()) => {
  const snapshotDate = toDateOnly(dateInput);
  const rows = await buildRows();
  const filePath = writeCsv(snapshotDate, rows);

  const result = await prisma.$transaction(async (tx) => {
    let snapshot = await tx.dailyStockSnapshot.findUnique({
      where: { snapshotDate },
    });

    if (snapshot) {
      await tx.dailyStockSnapshotItem.deleteMany({
        where: { snapshotId: snapshot.id },
      });
      snapshot = await tx.dailyStockSnapshot.update({
        where: { id: snapshot.id },
        data: {
          runAt: new Date(),
          filePath,
          totalItems: rows.length,
        },
      });
    } else {
      snapshot = await tx.dailyStockSnapshot.create({
        data: {
          snapshotDate,
          runAt: new Date(),
          filePath,
          totalItems: rows.length,
        },
      });
    }

    if (rows.length > 0) {
      await tx.dailyStockSnapshotItem.createMany({
        data: rows.map((r) => ({
          snapshotId: snapshot.id,
          placeType: r.placeType,
          placeId: r.placeId,
          placeName: r.placeName,
          itemType: r.itemType,
          itemId: r.itemId,
          itemName: r.itemName,
          unit: r.unit,
          category: r.category,
          stock: r.stock,
          avgCost: r.avgCost,
          scrap: r.scrap,
        })),
      });
    }

    return snapshot;
  });

  return result;
};

const startDailyStockCron = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await runDailyStockSnapshot(new Date());
      console.log("[DailyStockCron] Snapshot created successfully");
    } catch (error) {
      console.error("[DailyStockCron] Snapshot failed:", error.message);
    }
  });
};

module.exports = {
  startDailyStockCron,
  runDailyStockSnapshot,
};

