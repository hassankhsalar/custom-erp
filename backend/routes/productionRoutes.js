const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');
const { mergeIncomingBatch, parseDateOnly } = require('../utils/batchDetails');

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = 'your-secret-key'; // Replace with a strong secret key

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Helper function to generate a unique reference number
const generateReference = async () => {
  const count = await prisma.production.count();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `PROD-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
};

// Create a new production
router.post('/', authenticateToken, async (req, res) => {
  const { start_date, estimated_end_date, factoryId, status, products, materials } = req.body;
//, attachments removed
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(factoryId));
    const reference = await generateReference();

    const result = await prisma.$transaction(async (prisma) => {
      const materialsData = [];
      for (const material of materials) {
        const materialId = parseInt(material.materialId);
        const qty = parseFloat(material.quantity);

        const factoryMaterial = await prisma.factoryMaterial.findUnique({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId,
            }
          }
        });

        if (!factoryMaterial || factoryMaterial.stock < qty) {
          throw new Error(`Not enough stock for material ${material.name || materialId} in this factory`);
        }

        const baseMaterial = await prisma.material.findUnique({
          where: { id: materialId },
          select: { unit_cost: true }
        });
        const unitPrice = factoryMaterial.avg_cost && factoryMaterial.avg_cost > 0
          ? factoryMaterial.avg_cost
          : (baseMaterial?.unit_cost || 0);

        materialsData.push({
          materialId,
          quantity: qty,
          price: unitPrice,
        });
      }

      const newProduction = await prisma.production.create({
        data: {
          reference,
          start_date: new Date(start_date),
          estimated_end_date: new Date(estimated_end_date),
          factoryId: parseInt(factoryId),
          status,
          //attachments: attachments ? attachments.join(',') : null, 
          productionProducts: {
            create: products.map(p => ({
              productId: parseInt(p.productId),
              code: p.code,
              batchNumber: p.batchNumber ? String(p.batchNumber).trim() : null,
              expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
              manufactureDate: p.manufactureDate ? new Date(p.manufactureDate) : null,
              batchNotes: p.batchNotes || null,
              quantity: parseFloat(p.quantity),
              unit_cost: parseFloat(p.unit_cost),
            })),
          },
          productionMaterials: {
            create: materialsData,
          },
        },
        include: {
          productionProducts: true,
          productionMaterials: true,
        },
      });

      for (const material of materialsData) {
        await prisma.factoryMaterial.update({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId: material.materialId,
            }
          },
          data: {
            stock: {
              decrement: material.quantity,
            },
          },
        });
      }

      return newProduction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating production:', error);
    res.status(500).json({ error: `Failed to create production: ${error.message}` });
  }
});

// Get all productions with pagination
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'factory');
    }
    const productions = await prisma.production.findMany({
      ...(scope?.isAdmin ? {} : { where: { factoryId: { in: Array.from(scope.factories) } } }),
      skip,
      take: limit,
      include: {
        factory: true,
        productionProducts: {
          include: {
            product: true,
          },
        },
        productionMaterials: {
          include: {
            material: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalProductions = await prisma.production.count({
      ...(scope?.isAdmin ? {} : { where: { factoryId: { in: Array.from(scope.factories) } } })
    });

    res.json({
      productions,
      currentPage: page,
      totalPages: Math.ceil(totalProductions / limit),
      totalItems: totalProductions,
    });
  } catch (error) {
    console.error('Error fetching productions:', error);
    res.status(500).json({ error: 'Failed to fetch productions' });
  }
});

// Get a single production by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const production = await prisma.production.findUnique({
      where: { id: parseInt(id) },
      include: {
        factory: true,
        productionProducts: {
          include: {
            product: true,
          },
        },
        productionMaterials: {
          include: {
            material: true,
          }
        },

      },
    });

    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', production.factoryId);
    res.json(production);
  } catch (error) {
    console.error('Error fetching production:', error);
    res.status(500).json({ error: 'Failed to fetch production' });
  }
});

// Update a production
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { start_date, estimated_end_date, factoryId, status, products, materials } = req.body;
//, attachments
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(factoryId));
    const result = await prisma.$transaction(async (prisma) => {
      // Get the old production to find the old materials
      const oldProduction = await prisma.production.findUnique({
        where: { id: parseInt(id) },
        include: { productionMaterials: true },
      });
      if (oldProduction) {
        ensureIdScope(scope, 'factory', oldProduction.factoryId);
      }

      // Restore stock for old materials
      if (oldProduction && oldProduction.productionMaterials) {
        for (const material of oldProduction.productionMaterials) {
          await prisma.factoryMaterial.updateMany({
            where: {
              factoryId: oldProduction.factoryId, // Use factoryId from oldProduction
              materialId: material.materialId,
            },
            data: {
              stock: {
                increment: material.quantity,
              },
            },
          });
        }
      }

      // Delete old production products and materials
      await prisma.productionProducts.deleteMany({ where: { productionId: parseInt(id) } });
      await prisma.productionMaterial.deleteMany({ where: { productionId: parseInt(id) } });

      // Decrement stock for new materials and check for availability
      const materialsData = [];
      for (const material of materials) {
        const materialId = parseInt(material.materialId);
        const qty = parseFloat(material.quantity);

        const factoryMaterial = await prisma.factoryMaterial.findUnique({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId,
            }
          }
        });

        if (!factoryMaterial || factoryMaterial.stock < qty) {
          throw new Error(`Not enough stock for material ${materialId} in factory ${factoryId}`);
        }

        const baseMaterial = await prisma.material.findUnique({
          where: { id: materialId },
          select: { unit_cost: true }
        });
        const unitPrice = factoryMaterial.avg_cost && factoryMaterial.avg_cost > 0
          ? factoryMaterial.avg_cost
          : (baseMaterial?.unit_cost || 0);

        materialsData.push({
          materialId,
          quantity: qty,
          price: unitPrice,
        });

        await prisma.factoryMaterial.update({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId,
            }
          },
          data: {
            stock: {
              decrement: qty,
            },
          },
        });
      }

      // Update the production
      const updatedProduction = await prisma.production.update({
        where: { id: parseInt(id) },
        data: {
          start_date: new Date(start_date),
          estimated_end_date: new Date(estimated_end_date),
          factoryId: parseInt(factoryId),
          status,
          //attachments: attachments ? attachments.join(',') : null,
          productionProducts: {
            create: products.map(p => ({
              productId: parseInt(p.productId),
              code: p.code,
              quantity: parseFloat(p.quantity),
              unit_cost: parseFloat(p.unit_cost),
            })),
          },
          productionMaterials: {
            create: materialsData,
          },
        },
        include: {
          productionProducts: true,
          productionMaterials: true,
        },
      });

      return updatedProduction;
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating production:', error);
    res.status(500).json({ error: `Failed to update production: ${error.message}` });
  }
});

// Delete a production
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const production = await prisma.production.findUnique({
      where: { id: parseInt(id) },
      select: { factoryId: true }
    });
    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', production.factoryId);
    // Delete associated production products first
    await prisma.productionProducts.deleteMany({
      where: { productionId: parseInt(id) },
    });
    await prisma.production.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error deleting production:', error);
    res.status(500).json({ error: 'Failed to delete production' });
  }
});

// Change production status
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, products, materials } = req.body;

  try {
    const production = await prisma.production.findUnique({
      where: { id: parseInt(id) },
      select: { factoryId: true }
    });
    if (!production) {
      return res.status(404).json({ error: 'Production not found' });
    }
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', production.factoryId);
    const result = await prisma.$transaction(async (prisma) => {
      // Update production status
      const updatedProduction = await prisma.production.update({
        where: { id: parseInt(id) },
        data: { status, updatedAt: new Date(), end_date: status === 'production_done' ? new Date() : null },
      });

      if (status === 'production_done') {
        const safeNum = (val) => {
          const num = parseFloat(val);
          return Number.isFinite(num) ? num : 0;
        };

        const totalMaterialCost = (materials || []).reduce((sum, m) => {
          const qty = safeNum(m.quantity);
          const fine = safeNum(m.fine);
          const price = safeNum(m.price);
          const usedQty = Math.max(0, qty - fine);
          return sum + usedQty * price;
        }, 0);

        const totalFineProducts = (products || []).reduce((sum, p) => {
          return sum + safeNum(p.received);
        }, 0);

        const computedUnitCost = totalFineProducts > 0
          ? totalMaterialCost / totalFineProducts
          : 0;

        const factoryId = production.factoryId;
        
        // Update products with received and scrap quantities
        for (const p of products) {
          const incomingUnitCost = safeNum(p.unit_cost);
          const finalUnitCost = incomingUnitCost > 0 ? incomingUnitCost : computedUnitCost;

          await prisma.productionProducts.update({
            where: { id: p.id },
            data: {
              received: parseFloat(p.received),
              scrap: parseFloat(p.scrap),
              batchNumber: p.batchNumber ? String(p.batchNumber).trim() : undefined,
              expiryDate: p.expiryDate ? new Date(p.expiryDate) : undefined,
              manufactureDate: p.manufactureDate ? new Date(p.manufactureDate) : undefined,
              batchNotes: p.batchNotes !== undefined ? p.batchNotes : undefined,
              unit_cost: finalUnitCost,
            },
          });

          // Add fine products to factory stock
          const receivedQuantity = parseFloat(p.received || 0);
          const scrapQuantity = parseFloat(p.scrap || 0);
          
          if (receivedQuantity > 0 || scrapQuantity > 0) {
          const factoryProduct = await prisma.factoryProduct.findUnique({
            where: {
              factoryId_productId: {
                factoryId: factoryId,
                productId: p.productId,
              }
            }
          });

          const productCostRow = await prisma.product.findUnique({
            where: { id: p.productId },
            select: { cost: true }
          });
          const baseUnitCost = finalUnitCost > 0
            ? finalUnitCost
            : (productCostRow?.cost || 0);

          if (factoryProduct) {
            const existingStock = parseFloat(factoryProduct.stock) || 0;
            const existingAvg = factoryProduct.avg_cost;
            const normalizedExistingAvg = existingAvg && existingAvg > 0
              ? parseFloat(existingAvg)
              : baseUnitCost;
            const totalQty = existingStock + receivedQuantity;
            const newAvgCost = totalQty > 0
              ? ((normalizedExistingAvg * existingStock) + (baseUnitCost * receivedQuantity)) / totalQty
              : baseUnitCost;

            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: factoryId,
                  productId: p.productId,
                }
              },
              data: {
                stock: {
                  increment: receivedQuantity,
                },
                scrap: scrapQuantity > 0 ? scrapQuantity : factoryProduct.scrap, // Update scrap field
                avg_cost: newAvgCost,
                batchDetails: mergeIncomingBatch(factoryProduct.batchDetails, {
                  batchNumber: p.batchNumber || p.code,
                  expiryDate: parseDateOnly(p.expiryDate),
                  quantity: receivedQuantity,
                  unitCost: baseUnitCost,
                }),
              },
            });
          } else {
            await prisma.factoryProduct.create({
              data: {
                factoryId: factoryId,
                productId: p.productId,
                stock: receivedQuantity,
                scrap: scrapQuantity,
                avg_cost: baseUnitCost,
                batchDetails: mergeIncomingBatch(null, {
                  batchNumber: p.batchNumber || p.code,
                  expiryDate: parseDateOnly(p.expiryDate),
                  quantity: receivedQuantity,
                  unitCost: baseUnitCost,
                }),
              }
            });
          }
          }
        }
        
        // Update materials with scrap and fine quantities
        for (const m of materials) {
          await prisma.productionMaterial.update({
            where: { id: m.id },
            data: {
              scrap: parseFloat(m.scrap),
              fineMaterial: parseFloat(m.fine),
            },
          });

          const scrapQuantity = parseFloat(m.scrap || 0);
          const fineQuantity = parseFloat(m.fine || 0);
          
          // Add fine materials back to factory stock (restock)
          if (fineQuantity > 0 || scrapQuantity > 0) {
            const factoryMaterial = await prisma.factoryMaterial.findUnique({
              where: {
                factoryId_materialId: {
                  factoryId: factoryId,
                  materialId: m.materialId,
                }
              }
            });

            if (factoryMaterial) {
              await prisma.factoryMaterial.update({
                where: {
                  factoryId_materialId: {
                    factoryId: factoryId,
                    materialId: m.materialId,
                  }
                },
                data: {
                  stock: {
                    increment: fineQuantity,
                  },
                  scrap: scrapQuantity > 0 ? scrapQuantity : factoryMaterial.scrap, // Update scrap field
                },
              });
            } else {
              await prisma.factoryMaterial.create({
                data: {
                  factoryId: factoryId,
                  materialId: m.materialId,
                  stock: fineQuantity,
                  scrap: scrapQuantity,
                }
              });
            }
          }
        }
      }

      return updatedProduction;
    });

    res.json(result);
  } catch (error) {
    console.error(`Error updating status for production ${id}:`, error);
    res.status(500).json({ error: `Failed to update status: ${error.message}` });
  }
});

module.exports = router;
