const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new food category
router.post('/', async (req, res) => {
  try {
    const { name, image, isActive = true } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category with same name already exists (case insensitive)
    const existing = await prisma.foodCategory.findFirst({
      where: {
        name: {
          equals: name,
          // Remove mode and use a different approach for case insensitivity
        },
        deletedAt: false
      }
    });

    // Manual case-insensitive check if needed
    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.foodCategory.create({
      data: {
        name,
        image,
        isActive
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating food category:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all food categories with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive,
      sortBy = 'createdAt',
      sortDir = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * take;

    const where = { deletedAt: false };
    
    // Search filter - using contains without mode
    const searchText = String(search || '').trim();
    if (searchText) {
      where.name = { contains: searchText };
    }

    // Status filter
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const allowedSortBy = new Set(['id', 'name', 'isActive', 'createdAt']);
    const orderField = allowedSortBy.has(sortBy) ? sortBy : 'createdAt';
    const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [categories, totalCount] = await prisma.$transaction([
      prisma.foodCategory.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection }
      }),
      prisma.foodCategory.count({ where })
    ]);

    res.json({
      categories,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching food categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all food categories without pagination (for dropdowns)
router.get('/all', async (req, res) => {
  try {
    const { isActive = true } = req.query;
    
    const categories = await prisma.foodCategory.findMany({
      where: { 
        deletedAt: false,
        ...(isActive !== undefined && { isActive: isActive === 'true' })
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching all food categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single food category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await prisma.foodCategory.findFirst({
      where: { 
        id: parseInt(id), 
        deletedAt: false 
      }
    });

    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ error: 'Food category not found' });
    }
  } catch (error) {
    console.error('Error fetching food category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a food category by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, isActive } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if another category with same name exists
    const existing = await prisma.foodCategory.findFirst({
      where: {
        name: {
          equals: name
        },
        id: { not: parseInt(id) },
        deletedAt: false
      }
    });

    // Manual case-insensitive check
    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.status(400).json({ error: 'Another category with this name already exists' });
    }

    const category = await prisma.foodCategory.update({
      where: { id: parseInt(id) },
      data: {
        name,
        image,
        isActive
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating food category:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete (soft delete) a food category by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.foodCategory.update({
      where: { id: parseInt(id) },
      data: { deletedAt: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting food category:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;