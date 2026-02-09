const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a material scrap record (updated)
router.post('/', async (req, res) => {
  const { fromType, fromId, reason, note, materials } = req.body;

  try {
    // Validate required fields
    if (!fromType || !fromId || !reason || !materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ error: 'fromType, fromId, reason and materials are required' });
    }

    // Validate fromType
    if (!['store', 'shop', 'factory'].includes(fromType)) {
      return res.status(400).json({ error: 'fromType must be store, shop, or factory' });
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

      // Check if material has sufficient stock at the branch
      let branchMaterial;
      switch (fromType) {
        case 'store':
          branchMaterial = await prisma.storeMaterial.findFirst({
            where: {
              store_id: parseInt(fromId),
              material_id: parseInt(material.materialId)
            }
          });
          break;
        case 'shop':
          branchMaterial = await prisma.shopMaterial.findFirst({
            where: {
              shop_id: parseInt(fromId),
              material_id: parseInt(material.materialId)
            }
          });
          break;
        case 'factory':
          branchMaterial = await prisma.factoryMaterial.findFirst({
            where: {
              factoryId: parseInt(fromId),
              materialId: parseInt(material.materialId)
            }
          });
          break;
      }

      if (!branchMaterial) {
        return res.status(400).json({ 
          error: `Material with ID ${material.materialId} not found at the selected ${fromType}` 
        });
      }

      if (branchMaterial.stock < material.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for material ${materialExists.name}. Available: ${branchMaterial.stock}, Requested: ${material.quantity}` 
        });
      }
    }

    // Calculate total loss
    const totalLoss = materials.reduce((sum, m) => sum + (m.quantity * m.lossPerUnit), 0);

    // Create the scrap record in a transaction
    const scrapRecord = await prisma.$transaction(async (prisma) => {
      // Create the scrap record
      const record = await prisma.scrapMaterialRecord.create({
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

      // Update stock and scrap fields in the appropriate table
      for (const material of materials) {
        const materialId = parseInt(material.materialId);
        const quantity = parseFloat(material.quantity);
        
        // Prepare update data - use increment for scrap (now works with Float)
        const updateData = {
          stock: { decrement: quantity },
          scrap: { increment: quantity } // Now works because scrap is Float
        };

        switch (fromType) {
          case 'store':
            await prisma.storeMaterial.update({
              where: {
                store_id_material_id: {
                  store_id: parseInt(fromId),
                  material_id: materialId
                }
              },
              data: updateData
            });
            break;
          case 'shop':
            await prisma.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: parseInt(fromId),
                  material_id: materialId
                }
              },
              data: updateData
            });
            break;
          case 'factory':
            await prisma.factoryMaterial.update({
              where: {
                factoryId_materialId: {
                  factoryId: parseInt(fromId),
                  materialId: materialId
                }
              },
              data: updateData
            });
            break;
        }
      }

      return record;
    });

    res.status(201).json(scrapRecord);
  } catch (error) {
    console.error('Error creating material scrap record:', error);
    res.status(500).json({ error: 'Failed to create material scrap record', details: error.message });
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

// Update material scrap record (updated)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fromType, fromId, reason, note, materials } = req.body;

  try {
    // ... (validation code remains the same)

    const updatedRecord = await prisma.$transaction(async (prisma) => {
      // First, get the existing record to revert changes
      const existingRecord = await prisma.scrapMaterialRecord.findUnique({
        where: { id: parseInt(id) },
        include: {
          scrapMaterial: true
        }
      });

      if (!existingRecord) {
        throw new Error('Record not found');
      }

      // Revert the previous stock/scrap adjustments
      for (const oldMaterial of existingRecord.scrapMaterial) {
        const revertData = {
          stock: { increment: oldMaterial.quantity },
          scrap: { decrement: oldMaterial.quantity } // Now works with Float
        };

        switch (fromType) {
          case 'store':
            await prisma.storeMaterial.update({
              where: {
                store_id_material_id: {
                  store_id: parseInt(fromId),
                  material_id: oldMaterial.materialId
                }
              },
              data: revertData
            });
            break;
          case 'shop':
            await prisma.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: parseInt(fromId),
                  material_id: oldMaterial.materialId
                }
              },
              data: revertData
            });
            break;
          case 'factory':
            await prisma.factoryMaterial.update({
              where: {
                factoryId_materialId: {
                  factoryId: parseInt(fromId),
                  materialId: oldMaterial.materialId
                }
              },
              data: revertData
            });
            break;
        }
      }

      // Delete existing scrap materials
      await prisma.scrapMaterial.deleteMany({
        where: { scrapMaterialRecordId: parseInt(id) }
      });

      // Apply new stock/scrap adjustments
      for (const material of materials) {
        const materialId = parseInt(material.materialId);
        const quantity = parseFloat(material.quantity);
        
        const updateData = {
          stock: { decrement: quantity },
          scrap: { increment: quantity } // Now works with Float
        };

        switch (fromType) {
          case 'store':
            await prisma.storeMaterial.update({
              where: {
                store_id_material_id: {
                  store_id: parseInt(fromId),
                  material_id: materialId
                }
              },
              data: updateData
            });
            break;
          case 'shop':
            await prisma.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: parseInt(fromId),
                  material_id: materialId
                }
              },
              data: updateData
            });
            break;
          case 'factory':
            await prisma.factoryMaterial.update({
              where: {
                factoryId_materialId: {
                  factoryId: parseInt(fromId),
                  materialId: materialId
                }
              },
              data: updateData
            });
            break;
        }
      }

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
    res.status(500).json({ error: 'Failed to update material scrap record', details: error.message });
  }
});

// Delete material scrap record (updated)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if record exists
    const record = await prisma.scrapMaterialRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        scrapMaterial: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Material scrap record not found' });
    }

    // Note: We need fromType and fromId to revert stock/scrap adjustments
    // Since we're not storing them in the model, we cannot revert automatically
    // You might want to add fromType and fromId fields to ScrapMaterialRecord model
    // For now, we'll just delete the record without reverting
    // This is a design decision - you need to decide if you want to:
    // 1. Add fromType/fromId fields to the model
    // 2. Store them in a separate table
    // 3. Not allow deletion once created

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

// Get materials by location (for selecting materials to scrap)
router.get('/materials-by-location', async (req, res) => {
  try {
    const { type, branchId } = req.query;

    if (!type || !branchId) {
      return res.status(400).json({ error: 'Type and branchId are required' });
    }

    if (!['store', 'shop', 'factory'].includes(type)) {
      return res.status(400).json({ error: 'Type must be store, shop, or factory' });
    }

    let materials = [];

    switch (type) {
      case 'store':
        const storeMaterials = await prisma.storeMaterial.findMany({
          where: {
            store_id: parseInt(branchId),
            stock: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        materials = storeMaterials.map(sm => ({
          id: sm.id || `store_${sm.store_id}_${sm.material_id}`, // Use existing ID or create composite
          materialId: sm.material_id,
          material: sm.material,
          stock: sm.stock || 0,
          scrap: sm.scrap || 0,
          avg_cost: sm.avg_cost,
          locationType: 'store',
          locationId: sm.store_id
        }));
        break;

      case 'shop':
        const shopMaterials = await prisma.shopMaterial.findMany({
          where: {
            shop_id: parseInt(branchId),
            stock: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        materials = shopMaterials.map(sm => ({
          id: sm.id || `shop_${sm.shop_id}_${sm.material_id}`,
          materialId: sm.material_id,
          material: sm.material,
          stock: sm.stock || 0,
          scrap: sm.scrap || 0,
          avg_cost: sm.avg_cost,
          locationType: 'shop',
          locationId: sm.shop_id
        }));
        break;

      case 'factory':
        const factoryMaterials = await prisma.factoryMaterial.findMany({
          where: {
            factoryId: parseInt(branchId),
            stock: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        materials = factoryMaterials.map(fm => ({
          id: fm.id || `factory_${fm.factoryId}_${fm.materialId}`,
          materialId: fm.materialId,
          material: fm.material,
          stock: fm.stock || 0,
          scrap: fm.scrap || 0,
          avg_cost: fm.avg_cost,
          locationType: 'factory',
          locationId: fm.factoryId
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid type. Must be store, shop, or factory' });
    }

    res.json({
      materials,
      total: materials.length,
      type,
      branchId
    });
  } catch (error) {
    console.error('Error fetching materials by location:', error);
    res.status(500).json({ error: 'Failed to fetch materials by location' });
  }
});

// Get scrap materials by location (scrap materials only)
router.get('/scrap-materials-by-location', async (req, res) => {
  try {
    const { type, branchId } = req.query;

    if (!type || !branchId) {
      return res.status(400).json({ error: 'Type and branchId are required' });
    }

    if (!['store', 'shop', 'factory'].includes(type)) {
      return res.status(400).json({ error: 'Type must be store, shop, or factory' });
    }

    let scrapMaterials = [];

    switch (type) {
      case 'store':
        const storeMaterials = await prisma.storeMaterial.findMany({
          where: {
            store_id: parseInt(branchId),
            scrap: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        scrapMaterials = storeMaterials.map(sm => ({
          id: sm.id || `store_${sm.store_id}_${sm.material_id}`,
          materialId: sm.material_id,
          material: sm.material,
          quantity: sm.scrap || 0,
          stock: sm.stock || 0,
          avg_cost: sm.avg_cost,
          locationType: 'store',
          locationId: sm.store_id,
          lossPerUnit: sm.material?.unit_cost || 0
        }));
        break;

      case 'shop':
        const shopMaterials = await prisma.shopMaterial.findMany({
          where: {
            shop_id: parseInt(branchId),
            scrap: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        scrapMaterials = shopMaterials.map(sm => ({
          id: sm.id || `shop_${sm.shop_id}_${sm.material_id}`,
          materialId: sm.material_id,
          material: sm.material,
          quantity: sm.scrap || 0,
          stock: sm.stock || 0,
          avg_cost: sm.avg_cost,
          locationType: 'shop',
          locationId: sm.shop_id,
          lossPerUnit: sm.material?.unit_cost || 0
        }));
        break;

      case 'factory':
        const factoryMaterials = await prisma.factoryMaterial.findMany({
          where: {
            factoryId: parseInt(branchId),
            scrap: {
              gt: 0
            }
          },
          include: {
            material: true
          }
        });

        scrapMaterials = factoryMaterials.map(fm => ({
          id: fm.id || `factory_${fm.factoryId}_${fm.materialId}`,
          materialId: fm.materialId,
          material: fm.material,
          quantity: fm.scrap || 0,
          stock: fm.stock || 0,
          avg_cost: fm.avg_cost,
          locationType: 'factory',
          locationId: fm.factoryId,
          lossPerUnit: fm.material?.unit_cost || 0
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid type. Must be store, shop, or factory' });
    }

    res.json({
      scrapMaterials,
      total: scrapMaterials.length,
      type,
      branchId
    });
  } catch (error) {
    console.error('Error fetching scrap materials by location:', error);
    res.status(500).json({ error: 'Failed to fetch scrap materials by location' });
  }
});

module.exports = router;