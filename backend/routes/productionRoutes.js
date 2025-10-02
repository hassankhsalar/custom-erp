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

// Helper function to generate a unique reference number
const generateReference = async () => {
  const count = await prisma.production.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `PROD-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
};

// Create a new production
router.post('/', authenticateToken, async (req, res) => {
  const { start_date, estimated_end_date, factoryId, status, attachments, shipping_cost, products } = req.body;

  try {
    const reference = await generateReference();
    const newProduction = await prisma.production.create({
      data: {
        reference,
        start_date: new Date(start_date),
        estimated_end_date: new Date(estimated_end_date),
        factoryId: parseInt(factoryId),
        status,
        attachments: attachments ? attachments.join(',') : null, // Store as comma-separated string
        shipping_cost: shipping_cost ? parseFloat(shipping_cost) : null,
        productionProducts: {
          create: products.map(p => ({
            productId: parseInt(p.productId),
            code: p.code,
            quantity: parseFloat(p.quantity),
            unit_cost: parseFloat(p.unit_cost),
            moved_to_store: parseFloat(p.moved_to_store || 0),
          })),
        },
      },
      include: {
        productionProducts: true,
      },
    });
    res.status(201).json(newProduction);
  } catch (error) {
    console.error('Error creating production:', error);
    res.status(500).json({ error: 'Failed to create production' });
  }
});

// Get all productions with pagination
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const productions = await prisma.production.findMany({
      skip,
      take: limit,
      include: {
        factory: true,
        productionProducts: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalProductions = await prisma.production.count();

    res.json({
      productions,
      currentPage: page,
      totalPages: Math.ceil(totalProductions / limit),
      totalItems: totalProductions,
    });
  } catch (error) {
    console.error('Error fetching productions:', error);
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
});

// Get a single production by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const production = await prisma.production.findUnique({
      where: { id: parseInt(id) },
      include: {
        factory: true,
        productionProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }
    res.json(production);
  } catch (error) {
    console.error('Error fetching production:', error);
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// Update a production
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { start_date, estimated_end_date, factoryId, status, attachments, shipping_cost, products } = req.body;

  try {
    // First, delete existing production products for this production
    await prisma.productionProducts.deleteMany({
      where: { productionId: parseInt(id) },
    });

    const updatedProduction = await prisma.production.update({
      where: { id: parseInt(id) },
      data: {
        start_date: new Date(start_date),
        estimated_end_date: new Date(estimated_end_date),
        factoryId: parseInt(factoryId),
        status,
        attachments: attachments ? attachments.join(',') : null,
        shipping_cost: shipping_cost ? parseFloat(shipping_cost) : null,
        productionProducts: {
          create: products.map(p => ({
            productId: parseInt(p.productId),
            code: p.code,
            quantity: parseFloat(p.quantity),
            unit_cost: parseFloat(p.unit_cost),
            moved_to_store: parseFloat(p.moved_to_store || 0),
          })),
        },
      },
      include: {
        productionProducts: true,
      },
    });
    res.json(updatedProduction);
  } catch (error) {
    console.error('Error updating production:', error);
    res.status(500).json({ error: 'Failed to update production' });
  }
});

// Delete a production
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Delete associated production products first
    await prisma.productionProducts.deleteMany({
      where: { productionId: parseInt(id) },
    });
    await prisma.production.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting production:', error);
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

module.exports = router;