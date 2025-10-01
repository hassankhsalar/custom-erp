
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new material
router.post('/', async (req, res) => {
  try {
    const material = await prisma.material.create({
      data: req.body,
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all materials
router.get('/', async (req, res) => {
  try {
    const materials = await prisma.material.findMany();
    res.json({materials});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findUnique({
      where: { id: parseInt(id) },
    });
    if (material) {
      res.json(material);
    } else {
      res.status(404).json({ error: 'Material not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a material by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(material);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a material by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.material.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
