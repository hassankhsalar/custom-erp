const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

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
    const reference = await generateReference();

    const result = await prisma.$transaction(async (prisma) => {
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
              quantity: parseFloat(p.quantity),
              unit_cost: parseFloat(p.unit_cost),
            })),
          },
          productionMaterials: {
            create: materials.map(m => ({
              materialId: parseInt(m.materialId),
              quantity: parseFloat(m.quantity),
              price: parseFloat(m.price),
            })),
          },
        },
        include: {
          productionProducts: true,
          productionMaterials: true,
        },
      });

      for (const material of materials) {
        const factoryMaterial = await prisma.factoryMaterial.findUnique({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId: parseInt(material.materialId),
            }
          }
        });

        if (!factoryMaterial || factoryMaterial.stock < parseFloat(material.quantity)) {
          throw new Error(`Not enough stock for material ${material.name} in this factory`);
        }

        await prisma.factoryMaterial.update({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId: parseInt(material.materialId),
            }
          },
          data: {
            stock: {
              decrement: parseFloat(material.quantity),
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
    const productions = await prisma.production.findMany({
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

    const totalProductions = await prisma.production.count();

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
    const result = await prisma.$transaction(async (prisma) => {
      // Get the old production to find the old materials
      const oldProduction = await prisma.production.findUnique({
        where: { id: parseInt(id) },
        include: { productionMaterials: true },
      });

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
      for (const material of materials) {
        const factoryMaterial = await prisma.factoryMaterial.findUnique({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId: parseInt(material.materialId),
            }
          }
        });

        if (!factoryMaterial || factoryMaterial.stock < parseFloat(material.quantity)) {
          throw new Error(`Not enough stock for material ${material.materialId} in factory ${factoryId}`);
        }

        await prisma.factoryMaterial.update({
          where: {
            factoryId_materialId: {
              factoryId: parseInt(factoryId),
              materialId: parseInt(material.materialId),
            }
          },
          data: {
            stock: {
              decrement: parseFloat(material.quantity),
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
            create: materials.map(m => ({
              materialId: parseInt(m.materialId),
              quantity: parseFloat(m.quantity),
              price: parseFloat(m.price),
            })),
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
    const result = await prisma.$transaction(async (prisma) => {
      // Update production status
      const updatedProduction = await prisma.production.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      if (status === 'production_done') {
        const production = await prisma.production.findUnique({
          where: { id: parseInt(id) },
        });
        const factoryId = production.factoryId;
        // Update products with received and scrap quantities
        for (const p of products) {
          await prisma.productionProducts.update({
            where: { id: p.id },
            data: {
              received: parseFloat(p.received),
              scrap: parseFloat(p.scrap),
              unit_cost: parseFloat(p.unit_cost),
            },
          });

          // Add fine products to factory stock
          if (p.received > 0) {
            const factoryProduct = await prisma.factoryProduct.findUnique({
              where: {
                factoryId_productId: {
                  factoryId: factoryId,
                  productId: p.productId,
                }
              }
            });

            if (factoryProduct) {
              await prisma.factoryProduct.update({
                where: {
                  factoryId_productId: {
                    factoryId: factoryId,
                    productId: p.productId,
                  }
                },
                data: {
                  stock: {
                    increment: parseFloat(p.received),
                  },
                },
              });
            } else {
              await prisma.factoryProduct.create({
                data: {
                  factoryId: factoryId,
                  productId: p.productId,
                  stock: parseFloat(p.received),
                }
              });
            }
          }
        }
        // Update materials with scrap quantities
        for (const m of materials) {
          await prisma.productionMaterial.update({
            where: { id: m.id },
            data: {
              scrap: parseFloat(m.scrap),
            },
          });
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