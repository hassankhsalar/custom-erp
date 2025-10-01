const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const router = express.Router();

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

// Get all stores with pagination
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const stores = await prisma.store.findMany({
      skip,
      take: limit,
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
      currentPage: page,
      totalPages: Math.ceil(totalStores / limit),
      totalItems: totalStores,
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get a single store by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
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
    res.status(500).json({ error: 'Failed to fetch store' });
  }
});

// Create a new store
router.post('/', authenticateToken, async (req, res) => {
  const { name, address, store_keeper, mobile } = req.body;
  try {
    const newStore = await prisma.store.create({
      data: {
        name,
        address,
        store_keeper,
        mobile,
      },
    });
    res.status(201).json(newStore);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Update a store
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, address, store_keeper, mobile } = req.body;
  try {
    const updatedStore = await prisma.store.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        store_keeper,
        mobile,
      },
    });
    res.json(updatedStore);
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// Delete a store
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
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