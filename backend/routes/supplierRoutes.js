const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// ✅ Add Supplier
router.post('/', async (req, res) => {
  try {
    const { name, mobile, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await prisma.supplier.create({
      data: { name, mobile, address },
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { id: 'desc' },
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, mobile, address } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { name, mobile, address },
    });

    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
