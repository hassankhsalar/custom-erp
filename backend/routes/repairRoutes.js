const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createTransaction } = require("../utils/transactionHelper");
const { createNotification } = require("../utils/notificationHelper");

const prisma = new PrismaClient();
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/repair-documents";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const normalizeItems = (rawItems) => {
  const parsed = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error("items are required");
  }
  const normalized = parsed.map((item) => {
    const itemType = String(item.itemType || "").toLowerCase();
    const quantity = parseFloat(item.quantity || 0);
    const productId = itemType === "product" ? parseInt(item.productId || item.itemId, 10) : null;
    const materialId = itemType === "material" ? parseInt(item.materialId || item.itemId, 10) : null;
    if (!["product", "material"].includes(itemType)) throw new Error("itemType must be product or material");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("item quantity must be > 0");
    if (itemType === "product" && !productId) throw new Error("product item needs productId");
    if (itemType === "material" && !materialId) throw new Error("material item needs materialId");
    return { itemType, quantity, productId, materialId };
  });
  return normalized;
};

const updateScrap = async (tx, fromType, fromId, itemType, itemId, op, amount) => {
  const delta = parseFloat(amount || 0);
  if (!delta || delta <= 0) return;
  const field = op === "increment" ? { increment: delta } : { decrement: delta };

  if (itemType === "product") {
    if (fromType === "store") {
      return tx.storeProduct.update({
        where: { store_id_product_id: { store_id: fromId, product_id: itemId } },
        data: { scrap: field },
      });
    }
    if (fromType === "shop") {
      return tx.shopProduct.update({
        where: { shop_id_product_id: { shop_id: fromId, product_id: itemId } },
        data: { scrap: field },
      });
    }
    return tx.factoryProduct.update({
      where: { factoryId_productId: { factoryId: fromId, productId: itemId } },
      data: { scrap: field },
    });
  }

  if (fromType === "store") {
    return tx.storeMaterial.update({
      where: { store_id_material_id: { store_id: fromId, material_id: itemId } },
      data: { scrap: field },
    });
  }
  if (fromType === "shop") {
    return tx.shopMaterial.update({
      where: { shop_id_material_id: { shop_id: fromId, material_id: itemId } },
      data: { scrap: field },
    });
  }
  return tx.factoryMaterial.update({
    where: { factoryId_materialId: { factoryId: fromId, materialId: itemId } },
    data: { scrap: field },
  });
};

const updateStock = async (tx, fromType, fromId, itemType, itemId, amount) => {
  const delta = parseFloat(amount || 0);
  if (!delta || delta <= 0) return;

  if (itemType === "product") {
    if (fromType === "store") {
      return tx.storeProduct.update({
        where: { store_id_product_id: { store_id: fromId, product_id: itemId } },
        data: { stock: { increment: delta } },
      });
    }
    if (fromType === "shop") {
      return tx.shopProduct.update({
        where: { shop_id_product_id: { shop_id: fromId, product_id: itemId } },
        data: { stock: { increment: delta } },
      });
    }
    return tx.factoryProduct.update({
      where: { factoryId_productId: { factoryId: fromId, productId: itemId } },
      data: { stock: { increment: delta } },
    });
  }

  if (fromType === "store") {
    return tx.storeMaterial.update({
      where: { store_id_material_id: { store_id: fromId, material_id: itemId } },
      data: { stock: { increment: delta } },
    });
  }
  if (fromType === "shop") {
    return tx.shopMaterial.update({
      where: { shop_id_material_id: { shop_id: fromId, material_id: itemId } },
      data: { stock: { increment: delta } },
    });
  }
  return tx.factoryMaterial.update({
    where: { factoryId_materialId: { factoryId: fromId, materialId: itemId } },
    data: { stock: { increment: delta } },
  });
};

router.get("/damaged-items", async (req, res) => {
  try {
    const sourceType = String(req.query.sourceType || "").toLowerCase();
    const sourceId = parseInt(req.query.sourceId, 10);
    if (!["store", "shop", "factory"].includes(sourceType)) {
      return res.status(400).json({ error: "sourceType must be store/shop/factory" });
    }
    if (!sourceId) return res.status(400).json({ error: "sourceId is required" });

    let productRows = [];
    let materialRows = [];
    if (sourceType === "store") {
      productRows = await prisma.storeProduct.findMany({ where: { store_id: sourceId, scrap: { gt: 0 } }, include: { product: true } });
      materialRows = await prisma.storeMaterial.findMany({ where: { store_id: sourceId, scrap: { gt: 0 } }, include: { material: true } });
    } else if (sourceType === "shop") {
      productRows = await prisma.shopProduct.findMany({ where: { shop_id: sourceId, scrap: { gt: 0 } }, include: { product: true } });
      materialRows = await prisma.shopMaterial.findMany({ where: { shop_id: sourceId, scrap: { gt: 0 } }, include: { material: true } });
    } else {
      productRows = await prisma.factoryProduct.findMany({ where: { factoryId: sourceId, scrap: { gt: 0 } }, include: { product: true } });
      materialRows = await prisma.factoryMaterial.findMany({ where: { factoryId: sourceId, scrap: { gt: 0 } }, include: { material: true } });
    }

    const products = productRows.map((r) => ({
      itemType: "product",
      id: r.product_id ?? r.productId,
      name: r.product?.name || "-",
      barcode: r.product?.barcode || null,
      availableQuantity: parseFloat(r.scrap || 0),
      unitPrice: parseFloat(r.product?.cost || r.avg_cost || 0),
    }));
    const materials = materialRows.map((r) => ({
      itemType: "material",
      id: r.material_id ?? r.materialId,
      name: r.material?.name || "-",
      barcode: r.material?.barcode || null,
      availableQuantity: parseFloat(r.scrap || 0),
      unitPrice: parseFloat(r.material?.unit_cost || r.avg_cost || 0),
    }));

    res.json({ sourceType, sourceId, items: [...products, ...materials], products, materials });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch damaged items" });
  }
});

router.post("/", upload.single("document"), async (req, res) => {
  try {
    const { fromType, fromId, shippingCost = 0, note, destination, accountId } = req.body;
    const normalizedFromType = String(fromType || "").toLowerCase();
    const normalizedFromId = parseInt(fromId, 10);
    if (!["store", "shop", "factory"].includes(normalizedFromType)) {
      return res.status(400).json({ error: "fromType must be store/shop/factory" });
    }
    if (!normalizedFromId || !destination) {
      return res.status(400).json({ error: "fromId and destination are required" });
    }
    const items = normalizeItems(req.body.items);
    const shippingCostValue = parseFloat(shippingCost || 0);
    if (shippingCostValue > 0 && !accountId) {
      return res.status(400).json({ error: "Account is required for shipping cost" });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const itemId = item.itemType === "product" ? item.productId : item.materialId;
        await updateScrap(tx, normalizedFromType, normalizedFromId, item.itemType, itemId, "decrement", item.quantity);
      }

      const repair = await tx.repairOrder.create({
        data: {
          reference: `REP-${Date.now()}`,
          destination: String(destination),
          shippingCost: shippingCostValue,
          document: req.file ? req.file.path : null,
          note: note || null,
          from: normalizedFromType,
          fromId: normalizedFromId,
          accountId: accountId ? parseInt(accountId, 10) : null,
          createdById: req.user?.userId || null,
        },
      });

      for (const item of items) {
        await tx.repairOrderItem.create({
          data: {
            repairId: repair.id,
            itemType: item.itemType,
            productId: item.productId,
            materialId: item.materialId,
            quantity: item.quantity,
            success: 0,
            fail: 0,
          },
        });
      }

      let transaction = null;
      if (shippingCostValue > 0 && accountId) {
        const accId = parseInt(accountId, 10);
        const account = await tx.accounts.findUnique({ where: { id: accId } });
        if (!account) throw new Error("Account not found");
        if ((parseFloat(account.balance) || 0) < shippingCostValue) {
          throw new Error("Insufficient account balance for shipping cost");
        }

        transaction = await createTransaction(tx, {
          reference: `REPAIR-SHIP-${Date.now()}-${repair.id}`,
          createdById: req.user?.userId || null,
          accountId: accId,
          purpose: "Shipping cost for repair",
          amount: shippingCostValue,
          added_to_account: false,
          payment_method: "cash",
          current_account_balance: (parseFloat(account.balance) || 0) - shippingCostValue,
          note: `Shipping cost for repair #${repair.id} to ${destination}`,
        });

        await tx.accounts.update({
          where: { id: accId },
          data: { balance: { decrement: shippingCostValue } },
        });
      }

      const created = await tx.repairOrder.findUnique({
        where: { id: repair.id },
        include: {
          account: true,
          items: { include: { product: true, material: true } },
        },
      });
      return { repair: created, transaction };
    });

    await createNotification(prisma, {
      title: `Repair created (${result.repair?.reference || result.repair?.id})`,
      description: `A new repair request ${result.repair?.reference || result.repair?.id} was created.`,
      forRole: "admin",
      link: "/repairs/list"
    });

    res.status(201).json({ message: "Repair request created successfully", ...result });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to create repair request" });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const usePagination = Number.isFinite(page) || Number.isFinite(limit);
    const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
    const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 20;
    const skip = (pageNumber - 1) * limitNumber;

    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.fromType) where.from = String(req.query.fromType);

    const totalItems = await prisma.repairOrder.count({ where });
    const repairs = await prisma.repairOrder.findMany({
      where,
      skip: usePagination ? skip : undefined,
      take: usePagination ? limitNumber : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        account: true,
        items: { include: { product: true, material: true } },
      },
    });

    if (usePagination) {
      return res.json({
        repairs,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalItems,
          totalPages: Math.ceil(totalItems / limitNumber),
        },
      });
    }

    res.json({ repairs });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch repairs" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid repair ID" });
    const repair = await prisma.repairOrder.findUnique({
      where: { id },
      include: { account: true, items: { include: { product: true, material: true } } },
    });
    if (!repair) return res.status(404).json({ error: "Repair request not found" });
    res.json({ repair });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch repair" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, returnedItems = [] } = req.body || {};
    if (!id) return res.status(400).json({ error: "Invalid repair ID" });

    const repair = await prisma.repairOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!repair) return res.status(404).json({ error: "Repair request not found" });
    if (status === "completed" && repair.status === "completed") {
      return res.status(400).json({ error: "Repair is already completed" });
    }

    const validatedReturned = [];
    for (const returned of Array.isArray(returnedItems) ? returnedItems : []) {
      const repairItemId = parseInt(returned.repairItemId, 10);
      const successQty = parseFloat(returned.successQuantity || 0);
      const failQty = parseFloat(returned.failQuantity || 0);
      const item = repair.items.find((x) => x.id === repairItemId);
      if (!item) return res.status(400).json({ error: `Repair item ${repairItemId} not found` });
      if (successQty < 0 || failQty < 0) return res.status(400).json({ error: "Quantities cannot be negative" });
      if (successQty + failQty > (parseFloat(item.quantity) || 0)) {
        return res.status(400).json({ error: `Returned quantity exceeds sent quantity for repair item ${repairItemId}` });
      }
      validatedReturned.push({ item, successQty, failQty });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRepair = await tx.repairOrder.update({
        where: { id },
        data: { status: status || repair.status, updatedAt: new Date() },
      });

      for (const returned of validatedReturned) {
        await tx.repairOrderItem.update({
          where: { id: returned.item.id },
          data: {
            success: returned.successQty,
            fail: returned.failQty,
            updatedAt: new Date(),
          },
        });

        const itemId = returned.item.itemType === "product" ? returned.item.productId : returned.item.materialId;
        if (returned.successQty > 0) {
          await updateStock(tx, repair.from, repair.fromId, returned.item.itemType, itemId, returned.successQty);
        }
        if (returned.failQty > 0) {
          await updateScrap(tx, repair.from, repair.fromId, returned.item.itemType, itemId, "increment", returned.failQty);
        }
      }

      return tx.repairOrder.findUnique({
        where: { id },
        include: { items: { include: { product: true, material: true } }, account: true },
      });
    });

    await createNotification(prisma, {
      title: `Repair receive update (${result?.reference || result?.id})`,
      description: `Repair ${result?.reference || result?.id} status updated to ${result?.status}.`,
      forRole: "admin",
      link: "/repairs/list"
    });

    res.json({ message: "Repair status updated successfully", repair: result });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update repair status" });
  }
});

module.exports = router;
