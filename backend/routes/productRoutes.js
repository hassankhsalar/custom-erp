
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new product with materials
router.post('/', async (req, res) => {
  const { materials, ...productData } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        materials: {
          create: materials.map(material => ({
            material_id: material.material_id,
            material_quantity: material.material_quantity,
            price: material.price
          })),
        },
      },
      include: {
        materials: true,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all products with pagination
router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        skip,
        take,
        include: {
          materials: {
            include: {
              material: true,
            },
          },
        },
      }),
      prisma.product.count(),
    ]);
    res.json({ products, totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a product by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { materials, ...productData } = req.body;

    // First, delete existing product materials for this product
    await prisma.productMaterial.deleteMany({
      where: { product_id: parseInt(id) },
    });

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...productData,
        materials: {
          create: materials.map(material => ({
            material_id: material.material_id,
            material_quantity: material.material_quantity,
            price: material.price
          })),
        },
      },
      include: {
        materials: true,
      },
    });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a product by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
     // First, delete existing product materials for this product
    await prisma.productMaterial.deleteMany({
      where: { product_id: parseInt(id) },
    });
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

///////////////////////////////

router.get('/store/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);

    const products = await prisma.product.findMany({
      include: {
        storeProducts: {
          where: { store_id: storeId },
          select: { stock: true },
        },
      },
    });

    // attach stock dynamically
    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      sale_price: p.sale_price,
      wholesale_price: p.wholesale_price,
      image: p.image,
      stock: p.storeProducts.length > 0 ? p.storeProducts[0].stock : 0,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching products for store:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
