const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');

const prisma = new PrismaClient();
const router = express.Router();

//const JWT_SECRET = 'your-secret-key'; // Replace with a strong secret key

// Middleware to protect routes
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (token == null) return res.sendStatus(401);

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403);
//     req.user = user;
//     next();
//   });
// };

// Get all stores with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const pagination = req.query.pagination !== 'false';

  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'store');
    }
    const stores = await prisma.store.findMany({
      ...(pagination && { skip, take: limit }),
      ...(scope?.isAdmin ? {} : { where: { id: { in: Array.from(scope.stores) } } }),
      include: {
        storeProducts: {
          include: {
            product: true,
          },
        },
        storeMaterials: {
          include: {
            material: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const totalStores = await prisma.store.count();

    res.json({
      stores,
      ...(pagination && { 
        currentPage: page,
        totalPages: Math.ceil(totalStores / limit),
        totalItems: totalStores,
      }),
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    if (error.status === 403) {
      return res.json({
        stores: [],
        ...(pagination && { currentPage: page, totalPages: 0, totalItems: 0 })
      });
    }
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get a single store by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'store', parseInt(id));
    const store = await prisma.store.findUnique({
      where: { id: parseInt(id) },
      include: {
        storeProducts: {
          include: {
            product: true,
          },
        },
        storeMaterials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    if (error.status === 403) {
      return res.json(null);
    }
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// Create a new store
router.post('/',  async (req, res) => {
  const { name, address, store_keeper, mobile, storeProducts, storeMaterials } = req.body;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const newStore = await prisma.store.create({
      data: {
        name,
        address,
        store_keeper,
        mobile,
        storeMaterials: {
          create: storeMaterials?.map(material => ({
            material_id: material.material_id,
            stock: material.stock,
          })),
        },
        storeProducts: {
          create: storeProducts?.map(product => ({
            product_id: product.product_id,
            stock: product.stock,
          })),
        },
      },
    });
    res.status(201).json(newStore);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Update a store
router.put('/:id',  async (req, res) => {
  const { id } = req.params;
  const { name, address, store_keeper, mobile, storeProducts, storeMaterials } = req.body;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // First, delete existing store materials and products
    await prisma.storeMaterial.deleteMany({
      where: { store_id: parseInt(id) },
    });
    await prisma.storeProduct.deleteMany({
      where: { store_id: parseInt(id) },
    });

    const updatedStore = await prisma.store.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        store_keeper,
        mobile,
        storeMaterials: {
          create: storeMaterials?.map(material => ({
            material_id: material.material_id,
            stock: material.stock,
          })),
        },
        storeProducts: {
          create: storeProducts?.map(product => ({
            product_id: product.product_id,
            stock: product.stock,
          })),
        },
      },
    });
    res.json(updatedStore);
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// Delete a store
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.store.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

module.exports = router;
