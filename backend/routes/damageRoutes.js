const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const normalizeFromType = (value) => String(value || "").trim().toLowerCase();
const normalizeItemType = (value) => String(value || "").trim().toLowerCase();

const getProductWhere = (fromType, fromId, productId) => {
  if (fromType === "store") return { store_id_product_id: { store_id: fromId, product_id: productId } };
  if (fromType === "shop") return { shop_id_product_id: { shop_id: fromId, product_id: productId } };
  return { factoryId_productId: { factoryId: fromId, productId } };
};

const getMaterialWhere = (fromType, fromId, materialId) => {
  if (fromType === "store") return { store_id_material_id: { store_id: fromId, material_id: materialId } };
  if (fromType === "shop") return { shop_id_material_id: { shop_id: fromId, material_id: materialId } };
  return { factoryId_materialId: { factoryId: fromId, materialId } };
};

const assertFromType = (fromType) => {
  if (!["store", "shop", "factory"].includes(fromType)) {
    const error = new Error("fromType must be store, shop, or factory");
    error.status = 400;
    throw error;
  }
};

const assertItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("At least one item is required");
    error.status = 400;
    throw error;
  }
};

const validateAndNormalizeItems = (items) => {
  return items.map((raw) => {
    const itemType = normalizeItemType(raw.itemType);
    const itemId = parseInt(raw.itemId ?? (itemType === "product" ? raw.productId : raw.materialId), 10);
    const quantity = Number(raw.quantity || 0);
    const lossPerUnit = Number(raw.lossPerUnit || 0);

    if (!["product", "material"].includes(itemType)) {
      const error = new Error("itemType must be product or material");
      error.status = 400;
      throw error;
    }
    if (!Number.isInteger(itemId) || itemId <= 0) {
      const error = new Error("Each item must include a valid itemId");
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error("Each item must include quantity greater than 0");
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(lossPerUnit) || lossPerUnit < 0) {
      const error = new Error("Each item must include lossPerUnit >= 0");
      error.status = 400;
      throw error;
    }

    return { itemType, itemId, quantity, lossPerUnit };
  });
};

const fetchBranchItems = async (fromType, fromId) => {
  let productRows = [];
  let materialRows = [];

  if (fromType === "store") {
    productRows = await prisma.storeProduct.findMany({ where: { store_id: fromId }, include: { product: true } });
    materialRows = await prisma.storeMaterial.findMany({ where: { store_id: fromId }, include: { material: true } });
  } else if (fromType === "shop") {
    productRows = await prisma.shopProduct.findMany({ where: { shop_id: fromId }, include: { product: true } });
    materialRows = await prisma.shopMaterial.findMany({ where: { shop_id: fromId }, include: { material: true } });
  } else {
    productRows = await prisma.factoryProduct.findMany({ where: { factoryId: fromId }, include: { product: true } });
    materialRows = await prisma.factoryMaterial.findMany({ where: { factoryId: fromId }, include: { material: true } });
  }

  const products = productRows
    .filter((row) => Number(row.stock || 0) > 0)
    .map((row) => ({
      itemType: "product",
      itemId: row.product_id ?? row.productId,
      name: row.product?.name || "Unknown Product",
      barcode: row.product?.barcode || "",
      unit: row.product?.unit || "unit",
      availableQuantity: Number(row.stock || 0),
      lossPerUnit: Number(row.avg_cost || row.product?.cost || 0),
    }));

  const materials = materialRows
    .filter((row) => Number(row.stock || 0) > 0)
    .map((row) => ({
      itemType: "material",
      itemId: row.material_id ?? row.materialId,
      name: row.material?.name || "Unknown Material",
      barcode: row.material?.barcode || "",
      unit: row.material?.unit || "unit",
      availableQuantity: Number(row.stock || 0),
      lossPerUnit: Number(row.avg_cost || row.material?.unit_cost || 0),
    }));

  return [...products, ...materials];
};

const updateBranchDamage = async (tx, fromType, fromId, itemType, itemId, operation, quantity) => {
  const qty = Number(quantity || 0);
  if (!qty) return;
  const stockField = operation === "add" ? { increment: qty } : { decrement: qty };
  const scrapField = operation === "add" ? { decrement: qty } : { increment: qty };

  if (itemType === "product") {
    const model = fromType === "store" ? tx.storeProduct : fromType === "shop" ? tx.shopProduct : tx.factoryProduct;
    await model.update({
      where: getProductWhere(fromType, fromId, itemId),
      data: { stock: stockField, scrap: scrapField },
    });
    return;
  }

  const model = fromType === "store" ? tx.storeMaterial : fromType === "shop" ? tx.shopMaterial : tx.factoryMaterial;
  await model.update({
    where: getMaterialWhere(fromType, fromId, itemId),
    data: { stock: stockField, scrap: scrapField },
  });
};

const ensureAvailability = async (tx, fromType, fromId, items) => {
  for (const item of items) {
    if (item.itemType === "product") {
      const product = await tx.product.findUnique({ where: { id: item.itemId }, select: { name: true } });
      if (!product) {
        const error = new Error(`Product not found (id: ${item.itemId})`);
        error.status = 404;
        throw error;
      }
      const model = fromType === "store" ? tx.storeProduct : fromType === "shop" ? tx.shopProduct : tx.factoryProduct;
      const branchRow = await model.findUnique({
        where: getProductWhere(fromType, fromId, item.itemId),
        select: { stock: true },
      });
      if (!branchRow || Number(branchRow.stock || 0) < item.quantity) {
        const error = new Error(`Insufficient stock for product ${product.name}`);
        error.status = 400;
        throw error;
      }
      continue;
    }

    const material = await tx.material.findUnique({ where: { id: item.itemId }, select: { name: true } });
    if (!material) {
      const error = new Error(`Material not found (id: ${item.itemId})`);
      error.status = 404;
      throw error;
    }
    const model = fromType === "store" ? tx.storeMaterial : fromType === "shop" ? tx.shopMaterial : tx.factoryMaterial;
    const branchRow = await model.findUnique({
      where: getMaterialWhere(fromType, fromId, item.itemId),
      select: { stock: true },
    });
    if (!branchRow || Number(branchRow.stock || 0) < item.quantity) {
      const error = new Error(`Insufficient stock for material ${material.name}`);
      error.status = 400;
      throw error;
    }
  }
};

const includeConfig = {
  items: {
    include: {
      product: { select: { id: true, name: true, barcode: true, unit: true } },
      material: { select: { id: true, name: true, barcode: true, unit: true } },
    },
    orderBy: { id: "asc" },
  },
};

router.get("/branch-items", async (req, res) => {
  try {
    const fromType = normalizeFromType(req.query.fromType);
    const fromId = parseInt(req.query.fromId, 10);
    assertFromType(fromType);
    if (!Number.isInteger(fromId) || fromId <= 0) {
      return res.status(400).json({ error: "fromId is required" });
    }

    const items = await fetchBranchItems(fromType, fromId);
    res.json({ items });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Failed to fetch branch items" });
  }
});

router.post("/", async (req, res) => {
  try {
    const fromType = normalizeFromType(req.body.fromType);
    const fromId = parseInt(req.body.fromId, 10);
    const reason = String(req.body.reason || "").trim();
    const note = String(req.body.note || "").trim();
    const rawItems = req.body.items;

    assertFromType(fromType);
    if (!Number.isInteger(fromId) || fromId <= 0) {
      return res.status(400).json({ error: "fromId is required" });
    }
    if (!reason) {
      return res.status(400).json({ error: "reason is required" });
    }
    assertItems(rawItems);
    const items = validateAndNormalizeItems(rawItems);
    const totalLoss = items.reduce((sum, item) => sum + item.quantity * item.lossPerUnit, 0);

    const record = await prisma.$transaction(async (tx) => {
      await ensureAvailability(tx, fromType, fromId, items);

      const created = await tx.damageRecord.create({
        data: {
          fromType,
          fromId,
          reason,
          note,
          totalLoss,
          items: {
            create: items.map((item) => ({
              itemType: item.itemType,
              productId: item.itemType === "product" ? item.itemId : null,
              materialId: item.itemType === "material" ? item.itemId : null,
              quantity: item.quantity,
              lossPerUnit: item.lossPerUnit,
            })),
          },
        },
        include: includeConfig,
      });

      for (const item of items) {
        await updateBranchDamage(tx, fromType, fromId, item.itemType, item.itemId, "subtract", item.quantity);
      }
      return created;
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || "Failed to create damage record" });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const [records, totalItems] = await Promise.all([
      prisma.damageRecord.findMany({
        skip,
        take: limit,
        include: includeConfig,
        orderBy: { createdAt: "desc" },
      }),
      prisma.damageRecord.count(),
    ]);

    res.json({
      records,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch damage records" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const record = await prisma.damageRecord.findUnique({
      where: { id },
      include: includeConfig,
    });
    if (!record) return res.status(404).json({ error: "Damage record not found" });
    return res.json(record);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch damage record" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    const fromType = normalizeFromType(req.body.fromType);
    const fromId = parseInt(req.body.fromId, 10);
    const reason = String(req.body.reason || "").trim();
    const note = String(req.body.note || "").trim();
    const rawItems = req.body.items;

    assertFromType(fromType);
    if (!Number.isInteger(fromId) || fromId <= 0) {
      return res.status(400).json({ error: "fromId is required" });
    }
    if (!reason) {
      return res.status(400).json({ error: "reason is required" });
    }
    assertItems(rawItems);
    const items = validateAndNormalizeItems(rawItems);
    const totalLoss = items.reduce((sum, item) => sum + item.quantity * item.lossPerUnit, 0);

    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.damageRecord.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        const error = new Error("Damage record not found");
        error.status = 404;
        throw error;
      }

      for (const oldItem of existing.items) {
        const oldItemType = normalizeItemType(oldItem.itemType);
        const oldItemId = oldItemType === "product" ? oldItem.productId : oldItem.materialId;
        if (!oldItemId) continue;
        await updateBranchDamage(tx, existing.fromType, existing.fromId, oldItemType, oldItemId, "add", oldItem.quantity);
      }

      await ensureAvailability(tx, fromType, fromId, items);

      const updated = await tx.damageRecord.update({
        where: { id },
        data: {
          fromType,
          fromId,
          reason,
          note,
          totalLoss,
          items: {
            deleteMany: {},
            create: items.map((item) => ({
              itemType: item.itemType,
              productId: item.itemType === "product" ? item.itemId : null,
              materialId: item.itemType === "material" ? item.itemId : null,
              quantity: item.quantity,
              lossPerUnit: item.lossPerUnit,
            })),
          },
        },
        include: includeConfig,
      });

      for (const item of items) {
        await updateBranchDamage(tx, fromType, fromId, item.itemType, item.itemId, "subtract", item.quantity);
      }
      return updated;
    });

    return res.json(record);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to update damage record" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });

    await prisma.$transaction(async (tx) => {
      const existing = await tx.damageRecord.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        const error = new Error("Damage record not found");
        error.status = 404;
        throw error;
      }

      for (const item of existing.items) {
        const itemType = normalizeItemType(item.itemType);
        const itemId = itemType === "product" ? item.productId : item.materialId;
        if (!itemId) continue;
        await updateBranchDamage(tx, existing.fromType, existing.fromId, itemType, itemId, "add", item.quantity);
      }

      await tx.damageRecord.delete({ where: { id } });
    });

    return res.json({ message: "Damage record deleted successfully" });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || "Failed to delete damage record" });
  }
});

module.exports = router;
