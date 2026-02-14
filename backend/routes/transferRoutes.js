const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { createTransaction } = require('../utils/transactionHelper');
const { buildScope, ensureIdScope, buildTransferOrFilter } = require('../utils/associateScope');
const { getAvailableBatches, mergeIncomingBatch, decrementBatch, parseDateOnly } = require('../utils/batchDetails');

const userHasPermission = async (userId, permission) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permission: true }
  });
  if (!user || !user.permission) return false;
  if (["admin", "superadmin"].includes(user.permission.name)) return true;
  const perms = user.permission.permissions || [];
  return perms.includes(permission);
};

const hasTransferAccess = (scope, transfer) => {
  if (scope.isAdmin) return true;
  if (transfer.from === "shop" && scope.shops.has(transfer.fromId)) return true;
  if (transfer.to === "shop" && scope.shops.has(transfer.toId)) return true;
  if (transfer.from === "store" && scope.stores.has(transfer.fromId)) return true;
  if (transfer.to === "store" && scope.stores.has(transfer.toId)) return true;
  if (transfer.from === "factory" && scope.factories.has(transfer.fromId)) return true;
  if (transfer.to === "factory" && scope.factories.has(transfer.toId)) return true;
  return false;
};

const JWT_SECRET = 'your-secret-key'; // Replace with a strong secret key

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const getStockModelConfig = (locationType, itemType, locationId, itemId) => {
  const locId = parseInt(locationId);
  const id = parseInt(itemId);
  if (locationType === "store") {
    if (itemType === "product") {
      return {
        model: "storeProduct",
        where: { store_id_product_id: { store_id: locId, product_id: id } },
        create: { store_id: locId, product_id: id },
      };
    }
    return {
      model: "storeMaterial",
      where: { store_id_material_id: { store_id: locId, material_id: id } },
      create: { store_id: locId, material_id: id },
    };
  }
  if (locationType === "shop") {
    if (itemType === "product") {
      return {
        model: "shopProduct",
        where: { shop_id_product_id: { shop_id: locId, product_id: id } },
        create: { shop_id: locId, product_id: id },
      };
    }
    return {
      model: "shopMaterial",
      where: { shop_id_material_id: { shop_id: locId, material_id: id } },
      create: { shop_id: locId, material_id: id },
    };
  }
  if (locationType === "factory") {
    if (itemType === "product") {
      return {
        model: "factoryProduct",
        where: { factoryId_productId: { factoryId: locId, productId: id } },
        create: { factoryId: locId, productId: id },
      };
    }
    return {
      model: "factoryMaterial",
      where: { factoryId_materialId: { factoryId: locId, materialId: id } },
      create: { factoryId: locId, materialId: id },
    };
  }
  throw new Error(`Invalid location type: ${locationType}`);
};


router.get('/', authenticateToken, async (req, res) => {
  try {
    const { from, to, page = 1, search='' } = req.query;
    const baseWhere = {};
    if (from) {
      baseWhere.from = from;
    }
    if (to) {
      baseWhere.to = to;
    }
    if (search) {
      baseWhere.OR = [
        { reference: { contains: search } },
        { note: { contains: search } },
      ];
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const scopeFilter = buildTransferOrFilter(scope);
    const where = Object.keys(baseWhere).length > 0
      ? (scopeFilter ? { AND: [scopeFilter, baseWhere] } : baseWhere)
      : (scopeFilter || {});

    const [transfers, totalItems] = await prisma.$transaction([
      prisma.transfer.findMany({
        where,
        skip: (page - 1) * 10,
        take: 10,
        include: {
          transferItems: {
            select: {
              item: true,
              itemId: true,
              productId: true,
              materialId: true,
              quantity: true,
              avg_cost: true,
              batchNumber: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transfer.count({ where }),
    ]);

  const totalPages = Math.ceil(totalItems / 10);

  // Collect all unique IDs for stores, shops, and factories
  const storeIds = new Set();
  const shopIds = new Set();
  const factoryIds = new Set();

  transfers.forEach(transfer => {
    if (transfer.from === 'store') storeIds.add(transfer.fromId);
    if (transfer.to === 'store') storeIds.add(transfer.toId);
    if (transfer.from === 'shop') shopIds.add(transfer.fromId);
    if (transfer.to === 'shop') shopIds.add(transfer.toId);
    if (transfer.from === 'factory') factoryIds.add(transfer.fromId);
    if (transfer.to === 'factory') factoryIds.add(transfer.toId);
  });

  // Fetch names in bulk
  const [stores, shops, factories] = await Promise.all([
    storeIds.size > 0 ? prisma.store.findMany({ where: { id: { in: Array.from(storeIds) } }, select: { id: true, name: true } }) : [],
    shopIds.size > 0 ? prisma.shop.findMany({ where: { id: { in: Array.from(shopIds) } }, select: { id: true, name: true } }) : [],
    factoryIds.size > 0 ? prisma.factory.findMany({ where: { id: { in: Array.from(factoryIds) } }, select: { id: true, name: true } }) : [],
  ]);

  const storeMap = new Map(stores.map(s => [s.id, s.name]));
  const shopMap = new Map(shops.map(s => [s.id, s.name]));
  const factoryMap = new Map(factories.map(f => [f.id, f.name]));

  const productIds = new Set();
  const materialIds = new Set();
  transfers.forEach(transfer => {
    transfer.transferItems.forEach(item => {
      if (item.item === 'product' && item.itemId) productIds.add(item.itemId);
      if (item.item === 'material' && item.itemId) materialIds.add(item.itemId);
    });
  });

  const [products, materials] = await Promise.all([
    productIds.size > 0
      ? prisma.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, name: true }
        })
      : [],
    materialIds.size > 0
      ? prisma.material.findMany({
          where: { id: { in: Array.from(materialIds) } },
          select: { id: true, name: true }
        })
      : [],
  ]);

  const productMap = new Map(products.map(p => [p.id, p.name]));
  const materialMap = new Map(materials.map(m => [m.id, m.name]));

  const transfersWithNamesAndTotalProducts = transfers.map(transfer => {
    let fromName = 'N/A';
    let toName = 'N/A';

    if (transfer.from === 'store') fromName = storeMap.get(transfer.fromId) || 'N/A';
    else if (transfer.from === 'shop') fromName = shopMap.get(transfer.fromId) || 'N/A';
    else if (transfer.from === 'factory') fromName = factoryMap.get(transfer.fromId) || 'N/A';

    if (transfer.to === 'store') toName = storeMap.get(transfer.toId) || 'N/A';
    else if (transfer.to === 'shop') toName = shopMap.get(transfer.toId) || 'N/A';
    else if (transfer.to === 'factory') toName = factoryMap.get(transfer.toId) || 'N/A';

    const totalProducts = transfer.transferItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalItems = transfer.transferItems.length;
    const transferItems = transfer.transferItems.map(item => ({
      ...item,
      name: item.item === 'product'
        ? (productMap.get(item.itemId) || 'Unknown Product')
        : (materialMap.get(item.itemId) || 'Unknown Material'),
    }));

    return {
      ...transfer,
      fromName,
      toName,
      totalProducts,
      totalItems,
      transferItems,
    };
  });

    res.json({
      transfers: transfersWithNamesAndTotalProducts,
      totalItems,
      totalPages,
      associations: {
        shops: Array.from(scope.shops),
        stores: Array.from(scope.stores),
        factories: Array.from(scope.factories)
      }
    });
  } catch (error) {
    if (error.status === 403) {
      return res.json({
        transfers: [],
        totalItems: 0,
        totalPages: 0,
        associations: { shops: [], stores: [], factories: [] }
      });
    }
    res.status(500).json({ error: error.message || "Failed to fetch transfers" });
  }
});

router.get('/available-items', authenticateToken, async (req, res) => {
  try {
    const { from, fromId, search = '' } = req.query;
    if (!from || !fromId) {
      return res.status(400).json({ error: 'from and fromId are required' });
    }

    const locId = parseInt(fromId);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, from, locId);

    const productWhere =
      from === 'store'
        ? { store_id: locId, stock: { gt: 0 } }
        : from === 'shop'
          ? { shop_id: locId, stock: { gt: 0 } }
          : { factoryId: locId, stock: { gt: 0 } };

    const materialWhere =
      from === 'store'
        ? { store_id: locId, stock: { gt: 0 } }
        : from === 'shop'
          ? { shop_id: locId, stock: { gt: 0 } }
          : { factoryId: locId, stock: { gt: 0 } };

    const productInclude =
      from === 'store'
        ? { product: true }
        : from === 'shop'
          ? { product: true }
          : { product: true };
    const materialInclude =
      from === 'store'
        ? { material: true }
        : from === 'shop'
          ? { material: true }
          : { material: true };

    const [products, materials] = await Promise.all([
      (from === 'store' ? prisma.storeProduct : from === 'shop' ? prisma.shopProduct : prisma.factoryProduct).findMany({
        where: {
          ...productWhere,
          ...(search
            ? { product: { name: { contains: search } } }
            : {}),
        },
        include: productInclude,
      }),
      (from === 'store' ? prisma.storeMaterial : from === 'shop' ? prisma.shopMaterial : prisma.factoryMaterial).findMany({
        where: {
          ...materialWhere,
          ...(search
            ? { material: { name: { contains: search } } }
            : {}),
        },
        include: materialInclude,
      }),
    ]);

    const mappedProducts = products.map((row) => ({
      id: from === 'factory' ? row.productId : row.product_id,
      name: row.product?.name || 'Unknown Product',
      image: row.product?.image || null,
      itemType: 'product',
      stock: row.stock,
      batches: getAvailableBatches(row.batchDetails),
    }));
    const mappedMaterials = materials.map((row) => ({
      id: from === 'factory' ? row.materialId : row.material_id,
      name: row.material?.name || 'Unknown Material',
      image: row.material?.image || null,
      itemType: 'material',
      stock: row.stock,
      batches: getAvailableBatches(row.batchDetails),
    }));

    res.json([...mappedProducts, ...mappedMaterials]);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch available items' });
  }
});

router.post('/', authenticateToken, upload.single('document'), async (req, res) => {
  const { from, to, fromId, toId, items, shipping_cost, note, status } = req.body;
  const document = req.file;

  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, from, parseInt(fromId));
    ensureIdScope(scope, to, parseInt(toId));

    const transfer = await prisma.transfer.create({
      data: {
        reference: `TR-${Date.now()}`,
        from,
        to,
        fromId: parseInt(fromId),
        toId: parseInt(toId),
        shipping_cost: parseFloat(shipping_cost),
        note,
        document: document ? document.path : null,
        status: status || 'processing',
      },
    });

    // Create a transaction for the shipping cost amount
    if (shipping_cost > 0) {
      fromAccount = await prisma.accounts.findUnique({
        where: { id: parseInt(fromId) }
      });
      
      const transaction = {
        reference: `TRANS-SHIP-${Date.now()}-${transfer.id}`,
        createdById: req.user.userId,
        accountId: fromAccount.id,
        purpose: 'Shipping cost for transfer',
        amount: parseFloat(shipping_cost),
        added_to_account: false,
        payment_method: 'cash',
        current_account_balance: null,
        note: `Shipping cost for transfer #${transfer.id} to ${to}`
      };

      await createTransaction(prisma, transaction);
    }

    const parsedItems = JSON.parse(items);

    for (const item of parsedItems) {
      const itemType = item.itemType;
      const itemId = parseInt(item.id);
      const quantity = parseFloat(item.quantity);
      if (!itemType || !["product", "material"].includes(itemType) || !itemId || quantity <= 0) {
        throw new Error("Each transfer item must have valid itemType, id, and quantity");
      }

      const config = getStockModelConfig(from, itemType, fromId, itemId);
      const sourceRow = await prisma[config.model].findUnique({ where: config.where });
      if (!sourceRow) {
        throw new Error(`Item ${itemId} not found in ${from} ${fromId}`);
      }
      if ((parseFloat(sourceRow.stock) || 0) < quantity) {
        throw new Error(`Insufficient stock for item ${itemId}. Available: ${sourceRow.stock}, Requested: ${quantity}`);
      }

      const batchNumber = item.batchNumber ? String(item.batchNumber).trim() : "";
      const expiryDate = parseDateOnly(item.expiryDate);
      let newBatchDetails = sourceRow.batchDetails;
      if (batchNumber) {
        newBatchDetails = decrementBatch(
          sourceRow.batchDetails,
          { batchNumber, expiryDate },
          quantity
        );
      }

      const sourceAvgCost = sourceRow.avg_cost ?? 0;
      const normalizedSourceAvgCost = sourceAvgCost && sourceAvgCost > 0
        ? sourceAvgCost
        : itemType === 'product'
          ? (await prisma.product.findUnique({
              where: { id: itemId },
              select: { cost: true }
            }))?.cost || 0
          : (await prisma.material.findUnique({
              where: { id: itemId },
              select: { unit_cost: true }
            }))?.unit_cost || 0;

      await prisma.transferItem.create({
        data: {
          transferId: transfer.id,
          item: itemType,
          itemId: itemId,
          productId: itemType === 'product' ? itemId : null,
          materialId: itemType === 'material' ? itemId : null,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          quantity,
          avg_cost: normalizedSourceAvgCost,
        },
      });

      await prisma[config.model].update({
        where: config.where,
        data: {
          stock: { decrement: quantity },
          batchDetails: newBatchDetails,
        },
      });
    }

    res.status(201).json(transfer);
  } catch (error) {
    console.error(error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// Update transfer status
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedTransfer = await prisma.$transaction(async (prisma) => {
      const transfer = await prisma.transfer.findUnique({
        where: { id: parseInt(id) },
        include: { transferItems: true },
      });

      if (!transfer) {
        return res.status(404).json({ error: 'Transfer not found' });
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
      }

      const userId = req.user?.userId || 0;
      const canChangeStatus = await userHasPermission(userId, "transfers_change_status");
      const canReceive = await userHasPermission(userId, "transfers_receive");
      const isReceiving = status === "transferred" || status === "transfer_done";

      if (canChangeStatus) {
        // allowed
      } else if (isReceiving) {
        const toMatch =
          (transfer.to === "shop" && scope.shops.has(transfer.toId)) ||
          (transfer.to === "store" && scope.stores.has(transfer.toId)) ||
          (transfer.to === "factory" && scope.factories.has(transfer.toId));
        if (!canReceive || !toMatch) {
          const err = new Error("Forbidden");
          err.status = 403;
          throw err;
        }
      } else {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
      }

      const newStatus = await prisma.transfer.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      if (status === 'transferred') {
        const updateStock = async (locationType, locationId, itemId, quantity, itemType, transferAvgCost, selectedBatch) => {
          const itemIdInt = parseInt(itemId);
          const qty = parseFloat(quantity);
          const config = getStockModelConfig(locationType, itemType, locationId, itemIdInt);

          const avgCost = transferAvgCost && transferAvgCost > 0
            ? transferAvgCost
            : itemType === 'product'
              ? (await prisma.product.findUnique({
                  where: { id: itemIdInt },
                  select: { cost: true }
                }))?.cost || 0
              : (await prisma.material.findUnique({
                  where: { id: itemIdInt },
                  select: { unit_cost: true }
                }))?.unit_cost || 0;

          const existing = await prisma[config.model].findUnique({ where: config.where });
          if (existing) {
            const existingStock = parseFloat(existing.stock) || 0;
            const existingAvg = existing.avg_cost;
            const normalizedAvg = existingAvg === null || existingAvg === undefined ? avgCost : parseFloat(existingAvg);
            const totalQty = existingStock + qty;
            const newAvgCost = totalQty > 0
              ? ((normalizedAvg * existingStock) + (avgCost * qty)) / totalQty
              : avgCost;
            await prisma[config.model].update({
              where: config.where,
              data: {
                stock: { increment: qty },
                avg_cost: newAvgCost,
                batchDetails: mergeIncomingBatch(existing.batchDetails, {
                  batchNumber: selectedBatch?.batchNumber,
                  expiryDate: parseDateOnly(selectedBatch?.expiryDate),
                  quantity: qty,
                  unitCost: avgCost,
                }),
              },
            });
          } else {
            await prisma[config.model].create({
              data: {
                ...config.create,
                stock: qty,
                avg_cost: avgCost,
                batchDetails: mergeIncomingBatch(null, {
                  batchNumber: selectedBatch?.batchNumber,
                  expiryDate: parseDateOnly(selectedBatch?.expiryDate),
                  quantity: qty,
                  unitCost: avgCost,
                }),
              },
            });
          }
        };

        for (const item of transfer.transferItems) {
          await updateStock(
            transfer.to,
            transfer.toId,
            item.itemId,
            item.quantity,
            item.item,
            item.avg_cost,
            { batchNumber: item.batchNumber, expiryDate: item.expiryDate }
          );
        }
      }

      return newStatus;
    });

    res.json(updatedTransfer);
  } catch (error) {
    console.error('Error updating transfer status:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: `Failed to update transfer status: ${error.message}` });
  }
});

module.exports = router;
