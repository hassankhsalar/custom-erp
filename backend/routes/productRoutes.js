
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureIdScope } = require("../utils/associateScope");
const { withActiveWhere } = require("../utils/softDelete");

// Create a new product with materials
router.post('/', async (req, res) => {
  const { materials, ...productData } = req.body;
  const hasCode = Object.keys(productData).some(key => key === 'barcode');
  if (!hasCode) {
    let code = Date.now();
    productData.barcode = code;
  }
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
  const { page = 1, limit = 10, search } = req.query;
  const skip = (page - 1) * limit;
  const take = parseInt(limit);
  const where = {};
  where.deleted_at = false;

  if (search) {
    where.name = {
      contains: search,
    };
  }

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        skip,
        take,
        where,
        orderBy: { created_at: "desc" },
        include: {
          materials: {
            include: {
              material: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, totalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all products without pagination
router.get('/all-products', async (req, res) => {
  const { search } = req.query;
  const where = {};
  where.deleted_at = false;

  if (search) {
    where.name = {
      contains: search,
    };
  }

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: { created_at: "desc" },
      }),
      prisma.product.count({ where }),
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
    const product = await prisma.product.findFirst({
      where: { id: parseInt(id), deleted_at: false },
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
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.storeProduct.updateMany({
        where: { product_id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.shopProduct.updateMany({
        where: { product_id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.factoryProduct.updateMany({
        where: { productId: parseInt(id) },
        data: { deleted_at: true },
      });
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

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "store", storeId);

    const products = await prisma.product.findMany({
      where: withActiveWhere(),
      include: {
        storeProducts: {
          where: { store_id: storeId, deleted_at: false },
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
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: error.message });
  }
});

// search endpoint:
router.get('/search', async (req, res) => {
  const { q } = req.query;
  
  try {
    const products = await prisma.product.findMany({
      where: {
        deleted_at: false,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        barcode: true,
        description: true,
        cost: true,
        sale_price: true,
        stock: true,
        category: true
      }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

module.exports = router;
