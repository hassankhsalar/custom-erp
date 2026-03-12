const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Collection types
const COLLECTION_TYPES = {
  TOP_RATED: 'TOP_RATED',
  FEATURED: 'FEATURED',
  PREMIUM: 'PREMIUM'
};

// Debug middleware to check Prisma client
router.use((req, res, next) => {
  console.log('Prisma models available:', Object.keys(prisma));
  next();
});

// Add product to collection
router.post('/', async (req, res) => {
  try {
    const { productId, type } = req.body;
    console.log('Adding to collection:', { productId, type });

    // Validate type
    if (!Object.values(COLLECTION_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid collection type' });
    }

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId), 
        deleted_at: false 
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already exists
    const existing = await prisma.productCollection.findFirst({
      where: {
        productId: parseInt(productId),
        type: type,
        deletedAt: false
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Product already exists in this collection' });
    }

    // Create collection entry
    const collection = await prisma.productCollection.create({
      data: {
        productId: parseInt(productId),
        type: type
      },
      include: {
        product: true
      }
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error('Error adding to collection:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all collections with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      sortBy = 'createdAt', // Changed from 'created_at' to 'createdAt'
      sortDir = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * take;

    const where = { deletedAt: false };
    
    if (type) {
      where.type = type;
    }

    // Update allowed sortBy fields to use camelCase
    const allowedSortBy = new Set(['createdAt', 'id', 'type']);
    const orderField = allowedSortBy.has(sortBy) ? sortBy : 'createdAt';
    const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [collections, totalCount] = await prisma.$transaction([
      prisma.productCollection.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection },
        include: {
          product: {
            include: {
              materials: {
                include: {
                  material: true
                }
              }
            }
          }
        }
      }),
      prisma.productCollection.count({ where })
    ]);

    res.json({
      collections,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get collections by type (for frontend display)
router.get('/by-type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    if (!Object.values(COLLECTION_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid collection type' });
    }

    const collections = await prisma.productCollection.findMany({
      where: {
        type: type,
        deletedAt: false,
        product: {
          deleted_at: false
        }
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }, // Changed from created_at to createdAt
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            sale_price: true,
            wholesale_price: true,
            image: true,
            stock: true,
            category: true,
            brand: true,
            unit: true
          }
        }
      }
    });

    res.json(collections);
  } catch (error) {
    console.error('Error fetching collection by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single collection entry
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = await prisma.productCollection.findFirst({
      where: { 
        id: parseInt(id), 
        deletedAt: false 
      },
      include: {
        product: true
      }
    });

    if (collection) {
      res.json(collection);
    } else {
      res.status(404).json({ error: 'Collection entry not found' });
    }
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update collection entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    // Validate type
    if (!Object.values(COLLECTION_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid collection type' });
    }

    const collection = await prisma.productCollection.update({
      where: { id: parseInt(id) },
      data: { type },
      include: {
        product: true
      }
    });

    res.json(collection);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove from collection (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.productCollection.update({
      where: { id: parseInt(id) },
      data: { deletedAt: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing from collection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove product from specific collection type
router.delete('/product/:productId/type/:type', async (req, res) => {
  try {
    const { productId, type } = req.params;

    await prisma.productCollection.updateMany({
      where: {
        productId: parseInt(productId),
        type: type,
        deletedAt: false
      },
      data: { deletedAt: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing product from collection:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;