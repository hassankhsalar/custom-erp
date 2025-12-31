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
  });
  res.json(transfers);
});

router.post('/', upload.single('document'), async (req, res) => {
  const { from, to, fromId, toId, items, shipping_cost, note } = req.body;
  const document = req.file;

  try {
    const transfer = await prisma.transfer.create({
      data: {
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
          item: item.name,
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
            model = item.sale_price ? 'storeProduct' : 'storeMaterial';
            where = item.sale_price ? { store_id_product_id: { store_id: parseInt(locationId), product_id: id } } : { store_id_material_id: { store_id: parseInt(locationId), material_id: id } };
            data = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'shop':
            model = item.sale_price ? 'shopProduct' : 'shopMaterial';
            where = item.sale_price ? { shop_id_product_id: { shop_id: parseInt(locationId), product_id: id } } : { shop_id_material_id: { shop_id: parseInt(locationId), material_id: id } };
            data = { stock: increment ? { increment: qty } : { decrement: qty } };
            break;
          case 'factory':
            model = item.sale_price ? 'factoryProduct' : 'factoryMaterial';
            where = item.sale_price ? { factoryId_productId: { factoryId: parseInt(locationId), productId: id } } : { factoryId_materialId: { factoryId: parseInt(locationId), materialId: id } };
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