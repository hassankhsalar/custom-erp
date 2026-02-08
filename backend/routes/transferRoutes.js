const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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


router.get('/', authenticateToken, async (req, res) => {
  const { from, to, page = 1, search='' } = req.query;
  const where = {};
  if (from) {
    where.from = from;
  }
  if (to) {
    where.to = to;
  }
  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { note: { contains: search } },
    ];
  }
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
  });
});

router.post('/', authenticateToken, upload.single('document'), async (req, res) => {
  const { from, to, fromId, toId, items, shipping_cost, note, status } = req.body;
  const document = req.file;

  try {
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

    const parsedItems = JSON.parse(items);

    for (const item of parsedItems) {
      const itemType = item.itemType;
      const itemId = parseInt(item.id);
      const locId = parseInt(fromId);

      const sourceAvgCost = await (async () => {
        if (itemType === 'product') {
          if (from === 'store') {
            const row = await prisma.storeProduct.findUnique({
              where: { store_id_product_id: { store_id: locId, product_id: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
          if (from === 'shop') {
            const row = await prisma.shopProduct.findUnique({
              where: { shop_id_product_id: { shop_id: locId, product_id: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
          if (from === 'factory') {
            const row = await prisma.factoryProduct.findUnique({
              where: { factoryId_productId: { factoryId: locId, productId: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
        } else {
          if (from === 'store') {
            const row = await prisma.storeMaterial.findUnique({
              where: { store_id_material_id: { store_id: locId, material_id: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
          if (from === 'shop') {
            const row = await prisma.shopMaterial.findUnique({
              where: { shop_id_material_id: { shop_id: locId, material_id: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
          if (from === 'factory') {
            const row = await prisma.factoryMaterial.findUnique({
              where: { factoryId_materialId: { factoryId: locId, materialId: itemId } },
              select: { avg_cost: true }
            });
            return row?.avg_cost ?? 0;
          }
        }
        return 0;
      })();

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
          item: item.itemType,
          itemId: item.id,
          productId: item.itemType === 'product' ? item.id : null,
          materialId: item.itemType === 'material' ? item.id : null,
          quantity: parseFloat(item.quantity),
          avg_cost: normalizedSourceAvgCost,
        },
      });

      const updateStock = async (locationType, locationId, itemId, quantity, increment = false) => {
        let model;
        let where;
        let createData;
        let updateData;

        const id = parseInt(itemId);
        const qty = parseFloat(quantity);
        const locId = parseInt(locationId);

        switch (locationType) {
          case 'store':
            model = item.itemType === 'product' ? 'storeProduct' : 'storeMaterial';
            where = item.itemType === 'product'
              ? { store_id_product_id: { store_id: locId, product_id: id } }
              : { store_id_material_id: { store_id: locId, material_id: id } };

            if (item.itemType === 'product') {
                createData = { store_id: locId, product_id: id, stock: qty };
            } else {
                createData = { store_id: locId, material_id: id, stock: qty };
            }
            updateData = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'shop':
            model = item.itemType === 'product' ? 'shopProduct' : 'shopMaterial';
            where = item.itemType === 'product'
              ? { shop_id_product_id: { shop_id: locId, product_id: id } }
              : { shop_id_material_id: { shop_id: locId, material_id: id } };

            if (item.itemType === 'product') {
                createData = { shop_id: locId, product_id: id, stock: qty };
            } else {
                createData = { shop_id: locId, material_id: id, stock: qty };
            }
            updateData = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'factory':
            model = item.itemType === 'product' ? 'factoryProduct' : 'factoryMaterial';
            where = item.itemType === 'product'
              ? { factoryId_productId: { factoryId: locId, productId: id } }
              : { factoryId_materialId: { factoryId: locId, materialId: id } };

            if (item.itemType === 'product') {
                createData = { factoryId: locId, productId: id, stock: qty };
            } else {
                createData = { factoryId: locId, materialId: id, stock: qty };
            }
            updateData = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          default:
            return;
        }

        if (increment) { // If incrementing, use upsert
          await prisma[model].upsert({
            where,
            update: updateData,
            create: createData,
          });
        } else { // If decrementing, update existing record. If it doesn't exist, Prisma will throw an error.
          await prisma[model].update({ where, data: updateData });
        }
      };

      await updateStock(from, fromId, item.id, item.quantity, false);
    }

    res.status(201).json(transfer);
  } catch (error) {
    console.error(error);
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

      const newStatus = await prisma.transfer.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      if (status === 'transferred') {
        const updateStock = async (locationType, locationId, itemId, quantity, itemType, transferAvgCost) => {
          let model;
          let where;
          let createData;
          let updateData;

          const itemIdInt = parseInt(itemId);
          const qty = parseFloat(quantity);
          const locId = parseInt(locationId);

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

          switch (locationType) {
            case 'store':
              model = itemType === 'product' ? 'storeProduct' : 'storeMaterial';
              where = itemType === 'product'
                ? { store_id_product_id: { store_id: locId, product_id: itemIdInt } }
                : { store_id_material_id: { store_id: locId, material_id: itemIdInt } };
              createData = itemType === 'product'
                ? { store_id: locId, product_id: itemIdInt, stock: qty, avg_cost: avgCost }
                : { store_id: locId, material_id: itemIdInt, stock: qty, avg_cost: avgCost };
              break;
            case 'shop':
              model = itemType === 'product' ? 'shopProduct' : 'shopMaterial';
              where = itemType === 'product'
                ? { shop_id_product_id: { shop_id: locId, product_id: itemIdInt } }
                : { shop_id_material_id: { shop_id: locId, material_id: itemIdInt } };
              createData = itemType === 'product'
                ? { shop_id: locId, product_id: itemIdInt, stock: qty, avg_cost: avgCost }
                : { shop_id: locId, material_id: itemIdInt, stock: qty, avg_cost: avgCost };
              break;
            case 'factory':
              model = itemType === 'product' ? 'factoryProduct' : 'factoryMaterial';
              where = itemType === 'product'
                ? { factoryId_productId: { factoryId: locId, productId: itemIdInt } }
                : { factoryId_materialId: { factoryId: locId, materialId: itemIdInt } };
              createData = itemType === 'product'
                ? { factoryId: locId, productId: itemIdInt, stock: qty, avg_cost: avgCost }
                : { factoryId: locId, materialId: itemIdInt, stock: qty, avg_cost: avgCost };
              break;
            default:
              throw new Error(`Invalid location type: ${locationType}`);
          }

          const existing = await prisma[model].findUnique({ where });
          if (existing) {
            const existingStock = parseFloat(existing.stock) || 0;
            const existingAvg = existing.avg_cost;
            const normalizedAvg = existingAvg === null || existingAvg === undefined ? avgCost : parseFloat(existingAvg);
            const totalQty = existingStock + qty;
            const newAvgCost = totalQty > 0
              ? ((normalizedAvg * existingStock) + (avgCost * qty)) / totalQty
              : avgCost;
            updateData = { stock: { increment: qty }, avg_cost: newAvgCost };
            await prisma[model].update({ where, data: updateData });
          } else {
            await prisma[model].create({ data: createData });
          }
        };

        for (const item of transfer.transferItems) {
          await updateStock(transfer.to, transfer.toId, item.itemId, item.quantity, item.item, item.avg_cost);
        }
      }

      return newStatus;
    });

    res.json(updatedTransfer);
  } catch (error) {
    console.error('Error updating transfer status:', error);
    res.status(500).json({ error: `Failed to update transfer status: ${error.message}` });
  }
});

module.exports = router;
