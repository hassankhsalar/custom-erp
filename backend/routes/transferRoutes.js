const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { createTransaction } = require('../utils/transactionHelper');
const { createNotification } = require('../utils/notificationHelper');
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
const MANUAL_STATUSES = ['processing', 'pending', 'on_the_way', 'complete', 'not_received'];
const FINAL_STATUSES = ['complete', 'not_received'];
const buildTransferPlaceForeignKeys = (fromType, fromId, toType, toId) => ({
  fromStoreId: fromType === 'store' ? parseInt(fromId) : null,
  fromShopId: fromType === 'shop' ? parseInt(fromId) : null,
  fromFactoryId: fromType === 'factory' ? parseInt(fromId) : null,
  toStoreId: toType === 'store' ? parseInt(toId) : null,
  toShopId: toType === 'shop' ? parseInt(toId) : null,
  toFactoryId: toType === 'factory' ? parseInt(toId) : null,
});

const normalizeTransferStatus = (status) => {
  if (!status) return 'processing';
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'being_shipped') return 'on_the_way';
  if (normalized === 'transferred' || normalized === 'transfer_done') return 'complete';
  if (normalized === 'receive_with_missing') return 'partial';
  return normalized;
};

const canReceiveForDestination = (scope, transfer) => {
  if (scope.isAdmin) return true;
  if (transfer.to === 'shop') return scope.shops.has(transfer.toId);
  if (transfer.to === 'store') return scope.stores.has(transfer.toId);
  if (transfer.to === 'factory') return scope.factories.has(transfer.toId);
  return false;
};

const canReturnForSource = (scope, transfer) => {
  if (scope.isAdmin) return true;
  if (transfer.from === 'shop') return scope.shops.has(transfer.fromId);
  if (transfer.from === 'store') return scope.stores.has(transfer.fromId);
  if (transfer.from === 'factory') return scope.factories.has(transfer.fromId);
  return false;
};

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

const resolveDefaultAvgCost = async (tx, itemType, itemId, fallbackAvgCost) => {
  if (fallbackAvgCost && fallbackAvgCost > 0) return fallbackAvgCost;
  if (itemType === 'product') {
    return (
      (await tx.product.findUnique({
        where: { id: parseInt(itemId) },
        select: { cost: true }
      }))?.cost || 0
    );
  }
  return (
    (await tx.material.findUnique({
      where: { id: parseInt(itemId) },
      select: { unit_cost: true }
    }))?.unit_cost || 0
  );
};

const upsertStockWithBatch = async ({ tx, locationType, locationId, itemId, quantity, itemType, avgCost, selectedBatch }) => {
  const qty = parseFloat(quantity) || 0;
  if (qty <= 0) return;

  const config = getStockModelConfig(locationType, itemType, locationId, itemId);
  const resolvedAvgCost = await resolveDefaultAvgCost(tx, itemType, itemId, avgCost);
  const existing = await tx[config.model].findUnique({ where: config.where });

  if (existing) {
    const existingStock = parseFloat(existing.stock) || 0;
    const existingAvg = existing.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined ? resolvedAvgCost : parseFloat(existingAvg);
    const totalQty = existingStock + qty;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (resolvedAvgCost * qty)) / totalQty
      : resolvedAvgCost;

    await tx[config.model].update({
      where: config.where,
      data: {
        stock: { increment: qty },
        avg_cost: newAvgCost,
        batchDetails: mergeIncomingBatch(existing.batchDetails, {
          batchNumber: selectedBatch?.batchNumber,
          expiryDate: parseDateOnly(selectedBatch?.expiryDate),
          quantity: qty,
          unitCost: resolvedAvgCost,
        }),
      },
    });
  } else {
    await tx[config.model].create({
      data: {
        ...config.create,
        stock: qty,
        avg_cost: resolvedAvgCost,
        batchDetails: mergeIncomingBatch(null, {
          batchNumber: selectedBatch?.batchNumber,
          expiryDate: parseDateOnly(selectedBatch?.expiryDate),
          quantity: qty,
          unitCost: resolvedAvgCost,
        }),
      },
    });
  }
};

const decrementStockWithBatch = async ({ tx, locationType, locationId, itemId, quantity, itemType, selectedBatch }) => {
  const qty = parseFloat(quantity) || 0;
  if (qty <= 0) return;

  const config = getStockModelConfig(locationType, itemType, locationId, itemId);
  const existing = await tx[config.model].findUnique({ where: config.where });
  if (!existing) {
    throw new Error(`Stock row not found for ${itemType} ${itemId} at ${locationType} ${locationId}`);
  }

  const existingStock = parseFloat(existing.stock) || 0;
  if (existingStock + Number.EPSILON < qty) {
    throw new Error(`Insufficient stock for ${itemType} ${itemId}. Available: ${existingStock}, Required: ${qty}`);
  }

  let nextBatchDetails = existing.batchDetails;
  const batchNumber = selectedBatch?.batchNumber ? String(selectedBatch.batchNumber).trim() : "";
  if (batchNumber) {
    const expiryDate = parseDateOnly(selectedBatch?.expiryDate);
    nextBatchDetails = decrementBatch(existing.batchDetails, { batchNumber, expiryDate }, qty);
  }

  await tx[config.model].update({
    where: config.where,
    data: {
      stock: { decrement: qty },
      batchDetails: nextBatchDetails,
    },
  });
};

const parseTransferItemsPayload = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('At least one transfer item is required');
    err.status = 400;
    throw err;
  }

  return rawItems.map((raw) => {
    const itemType = String(raw.itemType || raw.item || '').trim().toLowerCase();
    const itemId = parseInt(raw.id ?? raw.itemId);
    const quantity = parseFloat(raw.quantity);
    const selectedQuantity = raw.selectedQuantity !== undefined && raw.selectedQuantity !== null
      ? parseFloat(raw.selectedQuantity)
      : null;
    const receivedQuantityRaw = raw.receivedQuantity !== undefined && raw.receivedQuantity !== null
      ? parseFloat(raw.receivedQuantity)
      : 0;

    if (!['product', 'material'].includes(itemType) || isNaN(itemId) || !Number.isFinite(quantity) || quantity <= 0) {
      const err = new Error('Each transfer item must have valid itemType, id, and quantity');
      err.status = 400;
      throw err;
    }

    const receivedQuantity = Number.isFinite(receivedQuantityRaw)
      ? Math.max(0, Math.min(quantity, receivedQuantityRaw))
      : 0;

    return {
      itemType,
      itemId,
      quantity,
      receivedQuantity,
      selectedName: raw.selectedName ? String(raw.selectedName).trim() : null,
      selectedUnit: raw.selectedUnit ? String(raw.selectedUnit).trim() : null,
      selectedQuantity: Number.isFinite(selectedQuantity) ? selectedQuantity : null,
      batchNumber: raw.batchNumber ? String(raw.batchNumber).trim() : "",
      expiryDate: parseDateOnly(raw.expiryDate),
    };
  });
};

const computeTransferSummary = (transferItems) => {
  const totalSent = transferItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalReceived = transferItems.reduce((sum, item) => sum + (parseFloat(item.receivedQuantity) || 0), 0);
  const totalRemaining = Math.max(0, totalSent - totalReceived);

  return {
    totalSent,
    totalReceived,
    totalRemaining,
    isComplete: totalRemaining <= Number.EPSILON,
  };
};

const updateRequisitionStatusFromSections = async (requisitionId) => {
  if (!requisitionId) return;
  const sections = await prisma.requisitionSection.findMany({
    where: { requisitionId: parseInt(requisitionId) },
    select: { status: true },
  });
  if (!sections.length) return;
  const statuses = new Set(sections.map((s) => s.status));
  let nextStatus = "segmented";
  if (statuses.size === 1 && statuses.has("rejected")) {
    nextStatus = "rejected";
  } else if (statuses.has("in_process") || statuses.has("transfer_ordered") || statuses.has("production_ordered")) {
    nextStatus = "in_process";
  } else if (!statuses.has("pending") && !statuses.has("in_process") && !statuses.has("transfer_ordered") && !statuses.has("production_ordered")) {
    nextStatus = statuses.has("rejected") ? "partially_approved" : "approved";
  }

  await prisma.requisition.update({
    where: { id: parseInt(requisitionId) },
    data: { status: nextStatus },
  });
};


router.get('/', authenticateToken, async (req, res) => {
  try {
    const { from, to, page = 1, limit = 10, search = '', status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const normalizedStatus = status ? normalizeTransferStatus(status) : null;
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
    if (normalizedStatus && normalizedStatus !== 'all') {
      baseWhere.status = normalizedStatus;
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const scopeFilter = buildTransferOrFilter(scope);
    const where = Object.keys(baseWhere).length > 0
      ? (scopeFilter ? { AND: [scopeFilter, baseWhere] } : baseWhere)
      : (scopeFilter || {});

    const [transfers, totalItems] = await prisma.$transaction([
      prisma.transfer.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        include: {
          fromStore: { select: { id: true, name: true } },
          fromShop: { select: { id: true, name: true } },
          fromFactory: { select: { id: true, name: true } },
          toStore: { select: { id: true, name: true } },
          toShop: { select: { id: true, name: true } },
          toFactory: { select: { id: true, name: true } },
          transferItems: {
            select: {
              id: true,
              item: true,
              itemId: true,
              productId: true,
              materialId: true,
              product: { select: { id: true, name: true } },
              material: { select: { id: true, name: true } },
              quantity: true,
              receivedQuantity: true,
              avg_cost: true,
              batchNumber: true,
              expiryDate: true,
              selectedName: true,
              selectedUnit: true,
              selectedQuantity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transfer.count({ where }),
    ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const transfersWithNamesAndTotalProducts = transfers.map(transfer => {
    const fromName =
      transfer.fromStore?.name ||
      transfer.fromShop?.name ||
      transfer.fromFactory?.name ||
      `${transfer.from} #${transfer.fromId}`;

    const toName =
      transfer.toStore?.name ||
      transfer.toShop?.name ||
      transfer.toFactory?.name ||
      `${transfer.to} #${transfer.toId}`;

    const totalProducts = transfer.transferItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalItems = transfer.transferItems.length;
    const transferItems = transfer.transferItems.map(item => ({
      ...item,
      remainingQuantity: Math.max(0, (parseFloat(item.quantity) || 0) - (parseFloat(item.receivedQuantity) || 0)),
      name:
        item.selectedName ||
        item.product?.name ||
        item.material?.name ||
        (item.item === 'product' ? 'Unknown Product' : 'Unknown Material'),
    }));

    const summary = computeTransferSummary(transfer.transferItems);

    return {
      ...transfer,
      status: normalizeTransferStatus(transfer.status),
      fromName,
      toName,
      totalProducts,
      totalItems,
      transferItems,
      summary,
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
      defaultUnit: row.product?.unit || 'unit',
      alternativeNames: row.product?.alternative_names || [],
      alternativeUnits: row.product?.alternative_units || [],
      image: row.product?.image || null,
      itemType: 'product',
      stock: row.stock,
      batches: getAvailableBatches(row.batchDetails),
    }));
    const mappedMaterials = materials.map((row) => ({
      id: from === 'factory' ? row.materialId : row.material_id,
      name: row.material?.name || 'Unknown Material',
      defaultUnit: row.material?.unit || 'unit',
      alternativeNames: row.material?.alternative_names || [],
      alternativeUnits: row.material?.alternative_units || [],
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
  const { from, to, fromId, toId, items, shipping_cost, note, status, requisitionId, requisitionSectionId } = req.body;
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
        ...buildTransferPlaceForeignKeys(from, fromId, to, toId),
        shipping_cost: parseFloat(shipping_cost),
        note,
        document: document ? document.path : null,
        status: normalizeTransferStatus(status || 'processing'),
        requisitionId: requisitionId ? parseInt(requisitionId) : null,
        requisitionSectionId: requisitionSectionId ? parseInt(requisitionSectionId) : null,
      },
    });

    // Create a transaction for the shipping cost amount
    if (parseFloat(shipping_cost) > 0) {
      const fromAccount = await prisma.accounts.findUnique({
        where: { id: parseInt(fromId) }
      });

      if (fromAccount?.id) {
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
          selectedName: item.selectedName ? String(item.selectedName).trim() : null,
          selectedUnit: item.selectedUnit ? String(item.selectedUnit).trim() : null,
          selectedQuantity: item.selectedQuantity !== undefined && item.selectedQuantity !== null ? parseFloat(item.selectedQuantity) : null,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          quantity,
          receivedQuantity: 0,
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

    if (requisitionSectionId) {
      await prisma.requisitionSection.update({
        where: { id: parseInt(requisitionSectionId) },
        data: { status: "in_process" },
      });
      if (requisitionId) {
        await updateRequisitionStatusFromSections(requisitionId);
      }
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

router.put('/:id', authenticateToken, upload.single('document'), async (req, res) => {
  const transferId = parseInt(req.params.id);
  if (isNaN(transferId)) {
    return res.status(400).json({ error: 'Invalid transfer id' });
  }

  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const canEdit = await userHasPermission(req.user?.userId || 0, 'transfers_edit');
    if (!canEdit) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { transferItems: true },
      });
      if (!transfer) {
        const err = new Error('Transfer not found');
        err.status = 404;
        throw err;
      }

      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const nextFrom = req.body?.from || transfer.from;
      const nextTo = req.body?.to || transfer.to;
      const nextFromId = req.body?.fromId ? parseInt(req.body.fromId) : transfer.fromId;
      const nextToId = req.body?.toId ? parseInt(req.body.toId) : transfer.toId;
      if (!nextFrom || !nextTo || isNaN(nextFromId) || isNaN(nextToId)) {
        const err = new Error('Invalid transfer locations');
        err.status = 400;
        throw err;
      }

      ensureIdScope(scope, nextFrom, nextFromId);
      ensureIdScope(scope, nextTo, nextToId);

      const payloadItems = req.body?.items
        ? parseTransferItemsPayload(JSON.parse(req.body.items))
        : parseTransferItemsPayload((transfer.transferItems || []).map((item) => ({
            itemType: item.item,
            id: item.itemId,
            quantity: item.quantity,
            selectedName: item.selectedName,
            selectedUnit: item.selectedUnit,
            selectedQuantity: item.selectedQuantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            receivedQuantity: item.receivedQuantity,
          })));

      const oldReturnedRows = await tx.transferReceiptItem.findMany({
        where: {
          transferItem: { transferId },
          receipt: { receiptType: 'return_unreceived' },
        },
        select: { transferItemId: true, quantity: true },
      });
      const oldReturnedByItem = new Map();
      oldReturnedRows.forEach((row) => {
        oldReturnedByItem.set(
          row.transferItemId,
          (oldReturnedByItem.get(row.transferItemId) || 0) + (parseFloat(row.quantity) || 0)
        );
      });

      for (const oldItem of transfer.transferItems) {
        const oldReceived = parseFloat(oldItem.receivedQuantity) || 0;
        if (oldReceived > 0) {
          await decrementStockWithBatch({
            tx,
            locationType: transfer.to,
            locationId: transfer.toId,
            itemId: oldItem.itemId,
            quantity: oldReceived,
            itemType: oldItem.item,
            selectedBatch: { batchNumber: oldItem.batchNumber, expiryDate: oldItem.expiryDate },
          });
        }

        const returnedQty = oldReturnedByItem.get(oldItem.id) || 0;
        const restoreQty = Math.max(0, (parseFloat(oldItem.quantity) || 0) - returnedQty);
        if (restoreQty > 0) {
          await upsertStockWithBatch({
            tx,
            locationType: transfer.from,
            locationId: transfer.fromId,
            itemId: oldItem.itemId,
            quantity: restoreQty,
            itemType: oldItem.item,
            avgCost: oldItem.avg_cost,
            selectedBatch: { batchNumber: oldItem.batchNumber, expiryDate: oldItem.expiryDate },
          });
        }
      }

      await tx.transferReceipt.deleteMany({ where: { transferId } });
      await tx.transferItem.deleteMany({ where: { transferId } });

      const createdItems = [];
      for (const item of payloadItems) {
        const config = getStockModelConfig(nextFrom, item.itemType, nextFromId, item.itemId);
        const sourceRow = await tx[config.model].findUnique({ where: config.where });
        if (!sourceRow) {
          const err = new Error(`Item ${item.itemId} not found in ${nextFrom} ${nextFromId}`);
          err.status = 400;
          throw err;
        }
        if ((parseFloat(sourceRow.stock) || 0) + Number.EPSILON < item.quantity) {
          const err = new Error(`Insufficient stock for item ${item.itemId}. Available: ${sourceRow.stock}, Requested: ${item.quantity}`);
          err.status = 400;
          throw err;
        }

        let newBatchDetails = sourceRow.batchDetails;
        if (item.batchNumber) {
          newBatchDetails = decrementBatch(
            sourceRow.batchDetails,
            { batchNumber: item.batchNumber, expiryDate: item.expiryDate },
            item.quantity
          );
        }

        const sourceAvgCost = sourceRow.avg_cost ?? 0;
        const normalizedSourceAvgCost = sourceAvgCost && sourceAvgCost > 0
          ? sourceAvgCost
          : item.itemType === 'product'
            ? (await tx.product.findUnique({ where: { id: item.itemId }, select: { cost: true } }))?.cost || 0
            : (await tx.material.findUnique({ where: { id: item.itemId }, select: { unit_cost: true } }))?.unit_cost || 0;

        const createdItem = await tx.transferItem.create({
          data: {
            transferId,
            item: item.itemType,
            itemId: item.itemId,
            productId: item.itemType === 'product' ? item.itemId : null,
            materialId: item.itemType === 'material' ? item.itemId : null,
            selectedName: item.selectedName,
            selectedUnit: item.selectedUnit,
            selectedQuantity: item.selectedQuantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            quantity: item.quantity,
            receivedQuantity: item.receivedQuantity,
            avg_cost: normalizedSourceAvgCost,
          },
        });

        await tx[config.model].update({
          where: config.where,
          data: {
            stock: { decrement: item.quantity },
            batchDetails: newBatchDetails,
          },
        });

        createdItems.push(createdItem);
      }

      const isCancel = normalizeTransferStatus(req.body?.status) === 'not_received';
      if (isCancel) {
        for (const createdItem of createdItems) {
          await tx.transferItem.update({
            where: { id: createdItem.id },
            data: { receivedQuantity: 0 },
          });
          createdItem.receivedQuantity = 0;
        }
      } else {
        for (const createdItem of createdItems) {
          const receivedQty = parseFloat(createdItem.receivedQuantity) || 0;
          if (receivedQty <= 0) continue;
          await upsertStockWithBatch({
            tx,
            locationType: nextTo,
            locationId: nextToId,
            itemId: createdItem.itemId,
            quantity: receivedQty,
            itemType: createdItem.item,
            avgCost: createdItem.avg_cost,
            selectedBatch: { batchNumber: createdItem.batchNumber, expiryDate: createdItem.expiryDate },
          });
        }
      }

      const summary = computeTransferSummary(createdItems);
      const requestedStatus = normalizeTransferStatus(req.body?.status || transfer.status);
      const nextStatus = requestedStatus === 'not_received'
        ? 'not_received'
        : (summary.isComplete ? 'complete' : (summary.totalReceived > 0 ? 'partial' : requestedStatus));

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          from: nextFrom,
          to: nextTo,
          fromId: nextFromId,
          toId: nextToId,
          ...buildTransferPlaceForeignKeys(nextFrom, nextFromId, nextTo, nextToId),
          shipping_cost: req.body?.shipping_cost !== undefined ? parseFloat(req.body.shipping_cost || 0) : transfer.shipping_cost,
          note: req.body?.note !== undefined ? req.body.note : transfer.note,
          status: nextStatus,
          isRecived: nextStatus === 'complete',
          document: req.file ? req.file.path : transfer.document,
        },
        include: { transferItems: true },
      });

      return { transfer: updatedTransfer, summary };
    });

    res.json(result);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.status === 404) return res.status(404).json({ error: 'Transfer not found' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to update transfer' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const transferId = parseInt(req.params.id);
  if (isNaN(transferId)) {
    return res.status(400).json({ error: 'Invalid transfer id' });
  }

  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const canDelete = await userHasPermission(req.user?.userId || 0, 'transfers_delete');
    if (!canDelete) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { transferItems: true },
      });
      if (!transfer) {
        const err = new Error('Transfer not found');
        err.status = 404;
        throw err;
      }

      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const oldReturnedRows = await tx.transferReceiptItem.findMany({
        where: {
          transferItem: { transferId },
          receipt: { receiptType: 'return_unreceived' },
        },
        select: { transferItemId: true, quantity: true },
      });
      const oldReturnedByItem = new Map();
      oldReturnedRows.forEach((row) => {
        oldReturnedByItem.set(
          row.transferItemId,
          (oldReturnedByItem.get(row.transferItemId) || 0) + (parseFloat(row.quantity) || 0)
        );
      });

      for (const item of transfer.transferItems) {
        const receivedQty = parseFloat(item.receivedQuantity) || 0;
        if (receivedQty > 0) {
          await decrementStockWithBatch({
            tx,
            locationType: transfer.to,
            locationId: transfer.toId,
            itemId: item.itemId,
            quantity: receivedQty,
            itemType: item.item,
            selectedBatch: { batchNumber: item.batchNumber, expiryDate: item.expiryDate },
          });
        }

        const returnedQty = oldReturnedByItem.get(item.id) || 0;
        const restoreQty = Math.max(0, (parseFloat(item.quantity) || 0) - returnedQty);
        if (restoreQty > 0) {
          await upsertStockWithBatch({
            tx,
            locationType: transfer.from,
            locationId: transfer.fromId,
            itemId: item.itemId,
            quantity: restoreQty,
            itemType: item.item,
            avgCost: item.avg_cost,
            selectedBatch: { batchNumber: item.batchNumber, expiryDate: item.expiryDate },
          });
        }
      }

      await tx.transfer.delete({ where: { id: transferId } });
    });

    res.json({ success: true });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.status === 404) return res.status(404).json({ error: 'Transfer not found' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to delete transfer' });
  }
});

// Update transfer status
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const normalizedStatus = normalizeTransferStatus(req.body?.status);
  if (!MANUAL_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
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
      if (!canChangeStatus) {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
      }

      if (FINAL_STATUSES.includes(normalizedStatus) && normalizeTransferStatus(transfer.status) !== normalizedStatus) {
        const err = new Error("Final statuses are managed by receive/return workflow");
        err.status = 400;
        throw err;
      }

      const newStatus = await tx.transfer.update({
        where: { id: parseInt(id) },
        data: { status: normalizedStatus },
      });

      return newStatus;
    });

    res.json(updatedTransfer);
  } catch (error) {
    console.error('Error updating transfer status:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: `Failed to update transfer status: ${error.message}` });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) {
      return res.status(400).json({ error: 'Invalid transfer id' });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { transferItems: true },
    });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!hasTransferAccess(scope, transfer)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const summary = computeTransferSummary(transfer.transferItems);
    res.json({
      ...transfer,
      status: normalizeTransferStatus(transfer.status),
      summary,
      transferItems: transfer.transferItems.map((item) => ({
        ...item,
        remainingQuantity: Math.max(0, (parseFloat(item.quantity) || 0) - (parseFloat(item.receivedQuantity) || 0)),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch transfer' });
  }
});

router.get('/:id/receipts', authenticateToken, async (req, res) => {
  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) {
      return res.status(400).json({ error: 'Invalid transfer id' });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { transferItems: true },
    });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!hasTransferAccess(scope, transfer)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const receipts = await prisma.transferReceipt.findMany({
      where: { transferId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            material: { select: { id: true, name: true } },
            transferItem: { select: { selectedName: true, selectedUnit: true, selectedQuantity: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ receipts });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch transfer receipts' });
  }
});

router.post('/:id/receive', authenticateToken, async (req, res) => {
  const transferId = parseInt(req.params.id);
  const mode = 'receive';
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const note = req.body?.note || null;

  if (isNaN(transferId)) return res.status(400).json({ error: 'Invalid transfer id' });
  if (items.length === 0) return res.status(400).json({ error: 'No receiving items were provided' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { transferItems: true },
      });
      if (!transfer) {
        const err = new Error('Transfer not found');
        err.status = 404;
        throw err;
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const canReceive = await userHasPermission(req.user?.userId || 0, 'transfers_receive');
      if (!canReceive || !canReceiveForDestination(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      if (normalizeTransferStatus(transfer.status) === 'not_received' || transfer.isRecived) {
        const err = new Error('This transfer is already closed');
        err.status = 400;
        throw err;
      }

      const requestedByItemId = new Map();
      items.forEach((raw) => {
        const transferItemId = parseInt(raw.transferItemId);
        const receivedQuantity = parseFloat(raw.receivedQuantity);
        if (!isNaN(transferItemId) && !isNaN(receivedQuantity) && receivedQuantity > 0) {
          requestedByItemId.set(transferItemId, (requestedByItemId.get(transferItemId) || 0) + receivedQuantity);
        }
      });

      if (requestedByItemId.size === 0) {
        const err = new Error('No valid received quantity was provided');
        err.status = 400;
        throw err;
      }

      const receiptItems = [];
      for (const transferItem of transfer.transferItems) {
        const receivedNow = requestedByItemId.get(transferItem.id) || 0;
        if (receivedNow <= 0) continue;

        const alreadyReceived = parseFloat(transferItem.receivedQuantity) || 0;
        const remaining = Math.max(0, (parseFloat(transferItem.quantity) || 0) - alreadyReceived);
        if (receivedNow > remaining + Number.EPSILON) {
          const err = new Error(`Received quantity exceeds remaining quantity for item ${transferItem.id}`);
          err.status = 400;
          throw err;
        }

        await upsertStockWithBatch({
          tx,
          locationType: transfer.to,
          locationId: transfer.toId,
          itemId: transferItem.itemId,
          quantity: receivedNow,
          itemType: transferItem.item,
          avgCost: transferItem.avg_cost,
          selectedBatch: { batchNumber: transferItem.batchNumber, expiryDate: transferItem.expiryDate },
        });

        await tx.transferItem.update({
          where: { id: transferItem.id },
          data: { receivedQuantity: alreadyReceived + receivedNow },
        });

        receiptItems.push({
          transferItemId: transferItem.id,
          itemType: transferItem.item,
          itemId: transferItem.itemId,
          productId: transferItem.productId,
          materialId: transferItem.materialId,
          quantity: receivedNow,
        });
      }

      if (receiptItems.length === 0) {
        const err = new Error('No receivable quantities were provided');
        err.status = 400;
        throw err;
      }

      const refreshedItems = await tx.transferItem.findMany({ where: { transferId } });
      const summary = computeTransferSummary(refreshedItems);
      const nextStatus = summary.isComplete ? 'complete' : 'partial';

      const receipt = await tx.transferReceipt.create({
        data: {
          transferId,
          reference: `TR-REC-${Date.now()}-${transferId}`,
          receiptType: mode,
          status: nextStatus,
          note,
          createdById: req.user?.userId || null,
          items: { create: receiptItems },
        },
        include: { items: true },
      });

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: nextStatus,
          isRecived: summary.isComplete ? true : false,
        },
        include: { transferItems: true },
      });

      if (nextStatus === 'partial') {
        await createNotification(tx, {
          title: `Partial transfer receive (${updatedTransfer.reference || updatedTransfer.id})`,
          description: `Transfer ${updatedTransfer.reference || updatedTransfer.id} was received partially. Received: ${summary.totalReceived}, Remaining: ${summary.totalRemaining}.`,
          forRole: 'admin',
          link: '/transfers'
        });
      }

      return { receipt, transfer: updatedTransfer, summary };
    });

    res.json(result);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.status === 404) return res.status(404).json({ error: 'Transfer not found' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to receive transfer items' });
  }
});

router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const transferId = parseInt(req.params.id);
  const note = req.body?.note || null;

  if (isNaN(transferId)) return res.status(400).json({ error: 'Invalid transfer id' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { transferItems: true },
      });
      if (!transfer) {
        const err = new Error('Transfer not found');
        err.status = 404;
        throw err;
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const canCancel = await userHasPermission(req.user?.userId || 0, 'transfers_receive');
      if (!canCancel || !canReceiveForDestination(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      await tx.transferItem.updateMany({
        where: { transferId },
        data: { receivedQuantity: 0 },
      });

      await tx.transferReceipt.create({
        data: {
          transferId,
          reference: `TR-CNL-${Date.now()}-${transferId}`,
          receiptType: 'cancel',
          status: 'not_received',
          note,
          createdById: req.user?.userId || null,
        },
      });

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'not_received',
          isRecived: false,
        },
        include: { transferItems: true },
      });

      const summary = computeTransferSummary(updatedTransfer.transferItems);
      return { transfer: updatedTransfer, summary };
    });

    res.json(result);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.status === 404) return res.status(404).json({ error: 'Transfer not found' });
    res.status(500).json({ error: error.message || 'Failed to cancel transfer' });
  }
});

router.post('/:id/return-unreceived', authenticateToken, async (req, res) => {
  const transferId = parseInt(req.params.id);
  const note = req.body?.note || null;

  if (isNaN(transferId)) return res.status(400).json({ error: 'Invalid transfer id' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { transferItems: true },
      });
      if (!transfer) {
        const err = new Error('Transfer not found');
        err.status = 404;
        throw err;
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      if (!hasTransferAccess(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const canReturn = await userHasPermission(req.user?.userId || 0, 'transfer_return');
      if (!canReturn || !canReturnForSource(scope, transfer)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      const priorReturn = await tx.transferReceipt.findFirst({
        where: {
          transferId,
          receiptType: 'return_unreceived',
        },
        select: { id: true },
      });
      if (priorReturn) {
        const err = new Error('Unreceived quantity was already returned');
        err.status = 400;
        throw err;
      }

      const returnItems = [];
      for (const transferItem of transfer.transferItems) {
        const alreadyReceived = parseFloat(transferItem.receivedQuantity) || 0;
        const remaining = Math.max(0, (parseFloat(transferItem.quantity) || 0) - alreadyReceived);
        if (remaining <= Number.EPSILON) continue;

        await upsertStockWithBatch({
          tx,
          locationType: transfer.from,
          locationId: transfer.fromId,
          itemId: transferItem.itemId,
          quantity: remaining,
          itemType: transferItem.item,
          avgCost: transferItem.avg_cost,
          selectedBatch: { batchNumber: transferItem.batchNumber, expiryDate: transferItem.expiryDate },
        });

        returnItems.push({
          transferItemId: transferItem.id,
          itemType: transferItem.item,
          itemId: transferItem.itemId,
          productId: transferItem.productId,
          materialId: transferItem.materialId,
          quantity: remaining,
        });
      }

      if (returnItems.length === 0) {
        const err = new Error('No unreceived items remain for return');
        err.status = 400;
        throw err;
      }

      const receipt = await tx.transferReceipt.create({
        data: {
          transferId,
          reference: `TR-RET-${Date.now()}-${transferId}`,
          receiptType: 'return_unreceived',
          status: 'not_received',
          note,
          createdById: req.user?.userId || null,
          items: { create: returnItems },
        },
        include: { items: true },
      });

      const refreshedItems = await tx.transferItem.findMany({ where: { transferId } });
      const summary = computeTransferSummary(refreshedItems);
      const nextStatus = summary.totalReceived > 0 ? 'partial' : 'not_received';

      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: nextStatus,
          isRecived: true,
        },
        include: { transferItems: true },
      });

      return { receipt, transfer: updatedTransfer, summary };
    });

    res.json(result);
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.status === 404) return res.status(404).json({ error: 'Transfer not found' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to return unreceived items' });
  }
});

module.exports = router;
