
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const { withActiveWhere } = require("../utils/softDelete");

// Create a new material
router.post('/', async (req, res) => {
  try {
    if(!req.body.barcode || req.body.barcode === null || req.body.barcode === '') {
      code = Date.now();
      req.body.barcode = String(code);
    }
    const material = await prisma.material.create({
      data: req.body,
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all materials with pagination
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { deleted_at: false };

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.material.count({ where });

    // Get materials with pagination
    const materials = await prisma.material.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      materials,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all materials
router.get('/all-materials', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      where: withActiveWhere(),
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      materials
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get a single material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const material = await prisma.material.findFirst({
      where: { id: parseInt(id), deleted_at: false },
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
    
    // Handle sale_price - can be null
    const updateData = { ...req.body };
    if (updateData.sale_price !== undefined) {
      updateData.sale_price = updateData.sale_price ? parseFloat(updateData.sale_price) : null;
    }
    if (updateData.unit_cost !== undefined) {
      updateData.unit_cost = parseFloat(updateData.unit_cost);
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: updateData,
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
    await prisma.$transaction(async (tx) => {
      await tx.material.update({
        where: { id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.storeMaterial.updateMany({
        where: { material_id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.shopMaterial.updateMany({
        where: { material_id: parseInt(id) },
        data: { deleted_at: true },
      });
      await tx.factoryMaterial.updateMany({
        where: { materialId: parseInt(id) },
        data: { deleted_at: true },
      });
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
