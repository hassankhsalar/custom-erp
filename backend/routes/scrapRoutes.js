const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = 'your-secret-key';


// Create a scrap record
router.post('/', async (req, res) => {
  const { reason, note, products } = req.body; // products: [{productId, quantity, lossPerUnit}]

  try {
    const totalLoss = products.reduce((sum, p) => sum + (p.quantity * p.lossPerUnit), 0);

    const scrapRecord = await prisma.scrapProductRecord.create({
      data: {
        reason,
        note,
        totalLoss,
        scrapProduct: {
          create: products.map(p => ({
            productId: parseInt(p.productId),
            quantity: parseFloat(p.quantity),
            lossPerUnit: parseFloat(p.lossPerUnit),
          }))
        }
      },
      include: {
        scrapProduct: {
          include: {
            product: true
          }
        }
      }
    });

    res.status(201).json(scrapRecord);
  } catch (error) {
    console.error('Error creating scrap record:', error);
    res.status(500).json({ error: 'Failed to create scrap record' });
  }
});

// Get all scrap records with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const scrapRecords = await prisma.scrapProductRecord.findMany({
      skip,
      take: limit,
      include: {
        scrapProduct: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true,
                cost: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.scrapProductRecord.count();

    res.json({
      scrapRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalItems: totalRecords
    });
  } catch (error) {
    console.error('Error fetching scrap records:', error);
    res.status(500).json({ error: 'Failed to fetch scrap records' });
  }
});

// Get single scrap record by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const scrapRecord = await prisma.scrapProductRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        scrapProduct: {
          include: {
            product: true
          }
        }
      }
    });

    if (!scrapRecord) {
      return res.status(404).json({ error: 'Scrap record not found' });
    }

    res.json(scrapRecord);
  } catch (error) {
    console.error('Error fetching scrap record:', error);
    res.status(500).json({ error: 'Failed to fetch scrap record' });
  }
});

// Update scrap record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { reason, note, products } = req.body;

  try {
    const totalLoss = products.reduce((sum, p) => sum + (p.quantity * p.lossPerUnit), 0);

    const updatedRecord = await prisma.$transaction(async (prisma) => {
      // Delete existing scrap products
      await prisma.scrapProduct.deleteMany({
        where: { scrapProductRecordId: parseInt(id) }
      });

      // Update the record with new products
      const record = await prisma.scrapProductRecord.update({
        where: { id: parseInt(id) },
        data: {
          reason,
          note,
          totalLoss,
          scrapProduct: {
            create: products.map(p => ({
              productId: parseInt(p.productId),
              quantity: parseFloat(p.quantity),
              lossPerUnit: parseFloat(p.lossPerUnit),
            }))
          }
        },
        include: {
          scrapProduct: {
            include: {
              product: true
            }
          }
        }
      });

      return record;
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating scrap record:', error);
    res.status(500).json({ error: 'Failed to update scrap record' });
  }
});

// Delete scrap record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.scrapProduct.deleteMany({
      where: { scrapProductRecordId: parseInt(id) }
    });

    await prisma.scrapProductRecord.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting scrap record:', error);
    res.status(500).json({ error: 'Failed to delete scrap record' });
  }
});

module.exports = router;