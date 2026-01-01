const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', async (req, res) => {
  const { from, to, page = 1, search } = req.query;
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
  const transfers = await prisma.transfer.findMany({
    where,
    skip: (page - 1) * 10,
    take: 10,
    include: {
      transferItems: {
        select: {
          quantity: true,
        },
      },
    },
  });

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

    return {
        ...transfer,
        fromName,
        toName,
        totalProducts,
    };
  });

  res.json(transfersWithNamesAndTotalProducts);
});

router.post('/', upload.single('document'), async (req, res) => {
  const { from, to, fromId, toId, items, shipping_cost, note } = req.body;
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
      },
    });

    const parsedItems = JSON.parse(items);

    for (const item of parsedItems) {
      await prisma.transferItem.create({
        data: {
          transferId: transfer.id,
          item: item.itemType,
          itemId: item.id,
          quantity: parseFloat(item.quantity),
        },
      });

      const updateStock = async (locationType, locationId, itemId, quantity, increment = false) => {
        let model;
        let where;
        let data;

        const id = parseInt(itemId);
        const qty = parseFloat(quantity);

        switch (locationType) {
          case 'store':
            model = item.itemType === 'product' ? 'storeProduct' : 'storeMaterial';
            where = item.itemType === 'product' ? { store_id_product_id: { store_id: parseInt(locationId), product_id: id } } : { store_id_material_id: { store_id: parseInt(locationId), material_id: id } };
            data = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'shop':
            model = item.itemType === 'product' ? 'shopProduct' : 'shopMaterial';
            where = item.itemType === 'product' ? { shop_id_product_id: { shop_id: parseInt(locationId), product_id: id } } : { shop_id_material_id: { shop_id: parseInt(locationId), material_id: id } };
            data = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'factory':
            model = item.itemType === 'product' ? 'factoryProduct' : 'factoryMaterial';
            where = item.itemType === 'product' ? { factoryId_productId: { factoryId: parseInt(locationId), productId: id } } : { factoryId_materialId: { factoryId: parseInt(locationId), materialId: id } };
            data = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          default:
            return;
        }

        await prisma[model].update({ where, data });
      };

      await updateStock(from, fromId, item.id, item.quantity, false);
      await updateStock(to, toId, item.id, item.quantity, true);
    }

    res.status(201).json(transfer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

module.exports = router;