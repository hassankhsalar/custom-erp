
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureIdScope } = require("../utils/associateScope");
const { withActiveWhere } = require("../utils/softDelete");
const { seedProductIntoAllPlaces } = require("../utils/inventoryBootstrap");

// Create a new product with materials
router.post('/', async (req, res) => {
  const { materials, ...productData } = req.body;
  const hasCode = Object.keys(productData).some(key => key === 'barcode');
  if (!hasCode || productData.barcode === null || productData.barcode === '') {
    let code = Date.now();
    productData.barcode = String(code);
  }
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...productData,
          materials: {
            create: (Array.isArray(materials) ? materials : []).map(material => ({
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

      await seedProductIntoAllPlaces(tx, created);
      return created;
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all products with pagination
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'created_at',
    sortDir = 'desc',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * take;

  const allowedSortBy = new Set([
    'created_at',
    'name',
    'sale_price',
    'wholesale_price',
    'cost',
    'stock',
    'alert_quantity',
    'category',
    'barcode',
  ]);

  const orderField = allowedSortBy.has(sortBy) ? sortBy : 'created_at';
  const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

  const where = { deleted_at: false };
  const searchText = String(search || '').trim();
  if (searchText) {
    where.OR = [
      { name: { contains: searchText } },
      { category: { contains: searchText } },
      { barcode: { contains: searchText } },
      { description: { contains: searchText } },
    ];
  }

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection },
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

    res.json({
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products overview counts (separate from paginated table data)
router.get('/overview', async (req, res) => {
  const { search = '' } = req.query;
  const searchText = String(search || '').trim();
  const where = { deleted_at: false };

  if (searchText) {
    where.OR = [
      { name: { contains: searchText } },
      { category: { contains: searchText } },
      { barcode: { contains: searchText } },
      { description: { contains: searchText } },
    ];
  }

  try {
    const [totalProducts, outOfStockProducts, stockRows] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.count({
        where: {
          ...where,
          stock: { lte: 0 },
        },
      }),
      prisma.product.findMany({
        where,
        select: {
          stock: true,
          alert_quantity: true,
        },
      }),
    ]);

    const lowStockProducts = stockRows.filter((row) => {
      const stock = Number(row.stock || 0);
      const alertQty = Number(row.alert_quantity || 0);
      return stock > 0 && alertQty > 0 && stock <= alertQty;
    }).length;

    res.json({
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      inStockProducts: Math.max(0, totalProducts - outOfStockProducts),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all products without pagination
router.get('/all-products', async (req, res) => {
  const { search = '', sortBy = 'created_at', sortDir = 'desc' } = req.query;
  const where = {};
  where.deleted_at = false;

  const searchText = String(search || '').trim();
  if (searchText) {
    where.OR = [
      { name: { contains: searchText } },
      { category: { contains: searchText } },
      { barcode: { contains: searchText } },
      { description: { contains: searchText } },
    ];
  }

  const allowedSortBy = new Set(['created_at', 'name', 'sale_price', 'wholesale_price', 'cost', 'stock', 'category', 'barcode']);
  const orderField = allowedSortBy.has(sortBy) ? sortBy : 'created_at';
  const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: { [orderField]: orderDirection },
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
          { name: { contains: q } },
          { barcode: { contains: q } },
          { description: { contains: q } }
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
