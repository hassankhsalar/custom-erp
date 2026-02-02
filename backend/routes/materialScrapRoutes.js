const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a material scrap record
router.post('/', async (req, res) => {
  const { reason, note, materials } = req.body;

  try {
    // Validate required fields
    if (!reason || !materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ error: 'Reason and materials are required' });
    }

    // Validate each material
    for (const material of materials) {
      if (!material.materialId || material.quantity <= 0 || material.lossPerUnit < 0) {
        return res.status(400).json({ 
          error: 'Each material must have materialId, positive quantity, and non-negative lossPerUnit' 
        });
      }

      // Check if material exists
      const materialExists = await prisma.material.findUnique({
        where: { id: parseInt(material.materialId) }
      });

      if (!materialExists) {
        return res.status(404).json({ 
          error: `Material with ID ${material.materialId} not found` 
        });
      }
    }

    // Calculate total loss
    const totalLoss = materials.reduce((sum, m) => sum + (m.quantity * m.lossPerUnit), 0);

    // Create the scrap record
    const scrapRecord = await prisma.scrapMaterialRecord.create({
      data: {
        reason,
        note: note || '',
        totalLoss,
        scrapMaterial: {
          create: materials.map(m => ({
            materialId: parseInt(m.materialId),
            quantity: parseFloat(m.quantity),
            lossPerUnit: parseFloat(m.lossPerUnit),
          }))
        }
      },
      include: {
        scrapMaterial: {
          include: {
            material: true
          }
        }
      }
    });

    // Note: We're NOT updating any stock or scrap fields in StoreMaterial/ShopMaterial/FactoryMaterial
    // as per your requirement. The scrap record is standalone.

    res.status(201).json(scrapRecord);
  } catch (error) {
    console.error('Error creating material scrap record:', error);
    res.status(500).json({ error: 'Failed to create material scrap record' });
  }
});

// Get all material scrap records with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const scrapRecords = await prisma.scrapMaterialRecord.findMany({
      skip,
      take: limit,
      include: {
        scrapMaterial: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit_cost: true,
                sale_price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.scrapMaterialRecord.count();

    res.json({
      scrapRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalItems: totalRecords
    });
  } catch (error) {
    console.error('Error fetching material scrap records:', error);
    res.status(500).json({ error: 'Failed to fetch material scrap records' });
  }
});

// Get single material scrap record by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const scrapRecord = await prisma.scrapMaterialRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        scrapMaterial: {
          include: {
            material: true
          }
        }
      }
    });

    if (!scrapRecord) {
      return res.status(404).json({ error: 'Material scrap record not found' });
    }

    res.json(scrapRecord);
  } catch (error) {
    console.error('Error fetching material scrap record:', error);
    res.status(500).json({ error: 'Failed to fetch material scrap record' });
  }
});

// Update material scrap record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { reason, note, materials } = req.body;

  try {
    // Validate required fields
    if (!reason || !materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ error: 'Reason and materials are required' });
    }

    // Validate each material
    for (const material of materials) {
      if (!material.materialId || material.quantity <= 0 || material.lossPerUnit < 0) {
        return res.status(400).json({ 
          error: 'Each material must have materialId, positive quantity, and non-negative lossPerUnit' 
        });
      }

      // Check if material exists
      const materialExists = await prisma.material.findUnique({
        where: { id: parseInt(material.materialId) }
      });

      if (!materialExists) {
        return res.status(404).json({ 
          error: `Material with ID ${material.materialId} not found` 
        });
      }
    }

    // Check if record exists
    const existingRecord = await prisma.scrapMaterialRecord.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRecord) {
      return res.status(404).json({ error: 'Material scrap record not found' });
    }

    // Calculate total loss
    const totalLoss = materials.reduce((sum, m) => sum + (m.quantity * m.lossPerUnit), 0);

    const updatedRecord = await prisma.$transaction(async (prisma) => {
      // Delete existing scrap materials
      await prisma.scrapMaterial.deleteMany({
        where: { scrapMaterialRecordId: parseInt(id) }
      });

      // Update the record with new materials
      const record = await prisma.scrapMaterialRecord.update({
        where: { id: parseInt(id) },
        data: {
          reason,
          note: note || '',
          totalLoss,
          scrapMaterial: {
            create: materials.map(m => ({
              materialId: parseInt(m.materialId),
              quantity: parseFloat(m.quantity),
              lossPerUnit: parseFloat(m.lossPerUnit),
            }))
          }
        },
        include: {
          scrapMaterial: {
            include: {
              material: true
            }
          }
        }
      });

      return record;
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating material scrap record:', error);
    res.status(500).json({ error: 'Failed to update material scrap record' });
  }
});

// Delete material scrap record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if record exists
    const record = await prisma.scrapMaterialRecord.findUnique({
      where: { id: parseInt(id) }
    });

    if (!record) {
      return res.status(404).json({ error: 'Material scrap record not found' });
    }

    await prisma.$transaction(async (prisma) => {
      // Delete scrap materials
      await prisma.scrapMaterial.deleteMany({
        where: { scrapMaterialRecordId: parseInt(id) }
      });

      // Delete the scrap record
      await prisma.scrapMaterialRecord.delete({
        where: { id: parseInt(id) }
      });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting material scrap record:', error);
    res.status(500).json({ error: 'Failed to delete material scrap record' });
  }
});

// Get scrap summary statistics
router.get('/summary/statistics', async (req, res) => {
  try {
    const totalRecords = await prisma.scrapMaterialRecord.count();
    
    const totalLoss = await prisma.scrapMaterialRecord.aggregate({
      _sum: {
        totalLoss: true
      }
    });
    
    const totalMaterials = await prisma.scrapMaterial.aggregate({
      _sum: {
        quantity: true
      }
    });

    // Get records count by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecords = await prisma.scrapMaterialRecord.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    res.json({
      totalRecords,
      totalLoss: totalLoss._sum.totalLoss || 0,
      totalMaterialsScrapped: totalMaterials._sum.quantity || 0,
      recentRecordsLast30Days: recentRecords,
      averageLossPerRecord: totalRecords > 0 ? (totalLoss._sum.totalLoss || 0) / totalRecords : 0
    });
  } catch (error) {
    console.error('Error fetching scrap statistics:', error);
    res.status(500).json({ error: 'Failed to fetch scrap statistics' });
  }
});

// Get scrap records by material ID
router.get('/material/:materialId', async (req, res) => {
  const { materialId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const scrapRecords = await prisma.scrapMaterialRecord.findMany({
      where: {
        scrapMaterial: {
          some: {
            materialId: parseInt(materialId)
          }
        }
      },
      skip,
      take: limit,
      include: {
        scrapMaterial: {
          where: {
            materialId: parseInt(materialId)
          },
          include: {
            material: {
              select: {
                id: true,
                name: true,
                barcode: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.scrapMaterialRecord.count({
      where: {
        scrapMaterial: {
          some: {
            materialId: parseInt(materialId)
          }
        }
      }
    });

    // Calculate total scrap for this material
    const totalScrap = await prisma.scrapMaterial.aggregate({
      where: {
        materialId: parseInt(materialId)
      },
      _sum: {
        quantity: true
      }
    });

    res.json({
      scrapRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalItems: totalRecords,
      materialScrapSummary: {
        materialId: parseInt(materialId),
        totalScrapped: totalScrap._sum.quantity || 0,
        totalRecords: totalRecords
      }
    });
  } catch (error) {
    console.error('Error fetching scrap records by material:', error);
    res.status(500).json({ error: 'Failed to fetch scrap records by material' });
  }
});

// Get scrap records by date range
router.get('/reports/by-date', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Adjust end date to include the whole day
    end.setHours(23, 59, 59, 999);

    const scrapRecords = await prisma.scrapMaterialRecord.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        scrapMaterial: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                barcode: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate statistics for the date range
    const totalLoss = scrapRecords.reduce((sum, record) => sum + record.totalLoss, 0);
    const totalMaterials = scrapRecords.reduce((sum, record) => 
      sum + record.scrapMaterial.reduce((sum2, sm) => sum2 + sm.quantity, 0), 0
    );

    res.json({
      scrapRecords,
      dateRange: {
        startDate: start,
        endDate: end
      },
      summary: {
        totalRecords: scrapRecords.length,
        totalLoss,
        totalMaterialsScrapped: totalMaterials,
        averageLossPerRecord: scrapRecords.length > 0 ? totalLoss / scrapRecords.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching scrap records by date range:', error);
    res.status(500).json({ error: 'Failed to fetch scrap records by date range' });
  }
});

module.exports = router;