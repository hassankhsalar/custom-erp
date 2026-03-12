const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get all valued customers with pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt', // Changed from 'created_at' to 'createdAt'
      sortDir = 'desc',
      isActive,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * take;

    // Update allowed sortBy fields to use camelCase
    const allowedSortBy = new Set(['id', 'createdAt', 'isActive']);
    const orderField = allowedSortBy.has(sortBy) ? sortBy : 'createdAt';
    const orderDirection = String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Use deletedAt (camelCase) instead of deleted_at
    const where = { deletedAt: false };
    
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [customers, totalCount] = await prisma.$transaction([
      prisma.valuedCustomer.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection },
      }),
      prisma.valuedCustomer.count({ where }),
    ]);

    res.json({
      customers,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('ERROR in valued customers route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new valued customer
router.post('/', async (req, res) => {
  try {
    const { image, isActive = true } = req.body;
    
    const valuedCustomer = await prisma.valuedCustomer.create({
      data: {
        image,
        isActive,
      },
    });
    
    res.status(201).json(valuedCustomer);
  } catch (error) {
    console.error('ERROR creating valued customer:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all valued customers without pagination (for dropdowns)
router.get('/all', async (req, res) => {
  try {
    const customers = await prisma.valuedCustomer.findMany({
      where: { 
        deletedAt: false, // Changed from deleted_at to deletedAt
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }, // Changed from created_at to createdAt
    });
    res.json(customers);
  } catch (error) {
    console.error('ERROR fetching all valued customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single valued customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.valuedCustomer.findFirst({
      where: { 
        id: parseInt(id), 
        deletedAt: false // Changed from deleted_at to deletedAt
      },
    });
    
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Valued customer not found' });
    }
  } catch (error) {
    console.error('ERROR fetching valued customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a valued customer by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { image, isActive } = req.body;

    const customer = await prisma.valuedCustomer.update({
      where: { id: parseInt(id) },
      data: {
        image,
        isActive,
      },
    });
    
    res.json(customer);
  } catch (error) {
    console.error('ERROR updating valued customer:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete (soft delete) a valued customer by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.valuedCustomer.update({
      where: { id: parseInt(id) },
      data: { deletedAt: true }, // Changed from deleted_at to deletedAt
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('ERROR deleting valued customer:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;