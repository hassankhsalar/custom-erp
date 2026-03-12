const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new home banner
router.post('/', async (req, res) => {
  try {
    const { image, heading, title, description, button } = req.body;

    // Validate required fields
    if (!heading || !title) {
      return res.status(400).json({ error: 'Heading and title are required fields' });
    }

    const banner = await prisma.homeBanner.create({
      data: {
        image,
        heading,
        title,
        description,
        button
      }
    });

    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating home banner:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all home banners with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortDir = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * take;

    const where = { deletedAt: false };

    const allowedSortBy = new Set(['id', 'heading', 'title', 'createdAt']);
    const orderField = allowedSortBy.has(sortBy) ? sortBy : 'createdAt';
    const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [banners, totalCount] = await prisma.$transaction([
      prisma.homeBanner.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection }
      }),
      prisma.homeBanner.count({ where })
    ]);

    res.json({
      banners,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching home banners:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all home banners without pagination (for frontend display)
router.get('/all', async (req, res) => {
  try {
    const banners = await prisma.homeBanner.findMany({
      where: { deletedAt: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(banners);
  } catch (error) {
    console.error('Error fetching all home banners:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single home banner by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await prisma.homeBanner.findFirst({
      where: { 
        id: parseInt(id), 
        deletedAt: false 
      }
    });

    if (banner) {
      res.json(banner);
    } else {
      res.status(404).json({ error: 'Home banner not found' });
    }
  } catch (error) {
    console.error('Error fetching home banner:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a home banner by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { image, heading, title, description, button } = req.body;

    // Validate required fields
    if (!heading || !title) {
      return res.status(400).json({ error: 'Heading and title are required fields' });
    }

    const banner = await prisma.homeBanner.update({
      where: { id: parseInt(id) },
      data: {
        image,
        heading,
        title,
        description,
        button
      }
    });

    res.json(banner);
  } catch (error) {
    console.error('Error updating home banner:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete (soft delete) a home banner by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.homeBanner.update({
      where: { id: parseInt(id) },
      data: { deletedAt: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting home banner:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;