const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');

const prisma = new PrismaClient();

// Get all factories
router.get('/', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'factory');
      const factories = await prisma.factory.findMany({
        where: { id: { in: Array.from(scope.factories) } }
      });
      return res.json(factories);
    }
    const factories = await prisma.factory.findMany();
    res.json(factories);
  } catch (error) {
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create a new factory
router.post('/', async (req, res) => {
  const { name, phone, manager, email, address } = req.body;
  const factory = await prisma.factory.create({
    data: {
      name,
      phone,
      manager,
      email,
      address,
    },
  });
  res.json(factory);
});

// Get a single factory
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const scope = await buildScope(prisma, req.user.userId);
      ensureIdScope(scope, 'factory', parseInt(id));
      const factory = await prisma.factory.findUnique({
          where: {
              id: parseInt(id),
          },
      });
      res.json(factory);
    } catch (error) {
      if (error.status === 403) {
        return res.json(null);
      }
      res.status(error.status || 500).json({ error: error.message });
    }
});

// Get factory materials with stock and avg_cost
router.get('/:id/materials', async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(id));
    const materials = await prisma.factoryMaterial.findMany({
      where: { factoryId: parseInt(id) },
      include: {
        material: {
          select: { id: true, name: true, unit: true, unit_cost: true }
        }
      }
    });
    res.json(materials);
  } catch (error) {
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch factory materials' });
  }
});

// Update a factory
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, manager, email, address } = req.body;
  const factory = await prisma.factory.update({
    where: {
      id: parseInt(id),
    },
    data: {
      name,
      phone,
      manager,
      email,
      address,
    },
  });
  res.json(factory);
});

// Delete a factory
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.factory.delete({
    where: {
      id: parseInt(id),
    },
  });
  res.json({ message: 'Factory deleted successfully' });
});

module.exports = router;
