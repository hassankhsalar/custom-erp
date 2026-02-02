const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/material-repair-documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const extname = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(extname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG are allowed.'));
    }
  }
});

// Create a material repair request
router.post('/', upload.single('document'), async (req, res) => {
  try {
    const { fromType, fromId, shippingCost, note, destination, materials } = req.body;
    const documentPath = req.file ? req.file.path : null;

    // Parse materials from JSON string
    const materialsArray = JSON.parse(materials);

    // Validate required fields
    if (!fromType || !fromId || !destination || !materialsArray || materialsArray.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the repair record
    const repairRecord = await prisma.$transaction(async (prisma) => {
      // Create the main repair record
      const repair = await prisma.materialRepair.create({
        data: {
          destination,
          shippingCost: parseFloat(shippingCost) || 0,
          document: documentPath,
          from: fromType,
          fromId: parseInt(fromId),
          note: note || ''
        }
      });

      // Create repair items
      const repairItems = await Promise.all(
        materialsArray.map(async (material) => {
          return await prisma.materialRepairItem.create({
            data: {
              repairId: repair.id,
              materialId: parseInt(material.materialId),
              quantity: parseFloat(material.quantity),
              success: parseFloat(material.success) || 0,
              fail: parseFloat(material.fail) || 0
            }
          });
        })
      );

      // Update scrap quantities in the source location
      for (const material of materialsArray) {
        switch (fromType) {
          case 'store':
            await prisma.storeMaterial.update({
              where: {
                store_id_material_id: {
                  store_id: parseInt(fromId),
                  material_id: parseInt(material.materialId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(material.quantity)
                }
              }
            });
            break;

          case 'shop':
            await prisma.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: parseInt(fromId),
                  material_id: parseInt(material.materialId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(material.quantity)
                }
              }
            });
            break;

          case 'factory':
            await prisma.factoryMaterial.update({
              where: {
                factoryId_materialId: {
                  factoryId: parseInt(fromId),
                  materialId: parseInt(material.materialId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(material.quantity)
                }
              }
            });
            break;
        }
      }

      return { repair, repairItems };
    });

    res.status(201).json({
      message: 'Material repair request created successfully',
      repairRecord
    });
  } catch (error) {
    console.error('Error creating material repair request:', error);
    res.status(500).json({ error: 'Failed to create material repair request' });
  }
});

// Get all material repair requests
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const repairs = await prisma.materialRepair.findMany({
      skip,
      take: limit,
      include: {
        materialRepairItem: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                brand: true,
                unit: true,
                unit_cost: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRepairs = await prisma.materialRepair.count();

    res.json({
      repairs,
      currentPage: page,
      totalPages: Math.ceil(totalRepairs / limit),
      totalItems: totalRepairs
    });
  } catch (error) {
    console.error('Error fetching material repair requests:', error);
    res.status(500).json({ error: 'Failed to fetch material repair requests' });
  }
});

// Get single material repair request by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const repair = await prisma.materialRepair.findUnique({
      where: { id: parseInt(id) },
      include: {
        materialRepairItem: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                brand: true,
                unit: true,
                unit_cost: true,
                sale_price: true
              }
            }
          }
        }
      }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Material repair request not found' });
    }

    res.json(repair);
  } catch (error) {
    console.error('Error fetching material repair request:', error);
    res.status(500).json({ error: 'Failed to fetch material repair request' });
  }
});

// Update material repair status (when materials return from repair)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, returnedMaterials } = req.body; // returnedMaterials: [{materialId, successQuantity, failQuantity}]

  try {
    const repair = await prisma.materialRepair.findUnique({
      where: { id: parseInt(id) },
      include: {
        materialRepairItem: {
          include: {
            material: true
          }
        }
      }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Material repair request not found' });
    }

    // Validate status transition
    if (status === 'completed' && repair.status === 'completed') {
      return res.status(400).json({ error: 'Material repair is already completed' });
    }

    // Validate returned materials if provided
    if (returnedMaterials && returnedMaterials.length > 0) {
      for (const returnedMaterial of returnedMaterials) {
        const repairItem = repair.materialRepairItem.find(
          item => item.materialId === parseInt(returnedMaterial.materialId)
        );

        if (!repairItem) {
          return res.status(400).json({ error: `Material ${returnedMaterial.materialId} not found in this repair` });
        }

        const successQty = parseFloat(returnedMaterial.successQuantity) || 0;
        const failQty = parseFloat(returnedMaterial.failQuantity) || 0;
        const totalReturned = successQty + failQty;
        
        // Validate quantities
        if (totalReturned > repairItem.quantity) {
          return res.status(400).json({ 
            error: `Total returned quantity (${totalReturned}) exceeds sent quantity (${repairItem.quantity}) for material ${repairItem.material?.name || returnedMaterial.materialId}` 
          });
        }

        if (successQty < 0 || failQty < 0) {
          return res.status(400).json({ error: 'Quantities cannot be negative' });
        }
      }
    }

    // Update in transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Update the main repair status
      const updatedRepair = await prisma.materialRepair.update({
        where: { id: parseInt(id) },
        data: {
          status: status || repair.status,
          updatedAt: new Date()
        },
        include: {
          materialRepairItem: true
        }
      });

      // If materials are returned, update stock in appropriate location
      if (returnedMaterials && returnedMaterials.length > 0) {
        for (const returnedMaterial of returnedMaterials) {
          const repairItem = repair.materialRepairItem.find(
            item => item.materialId === parseInt(returnedMaterial.materialId)
          );

          if (repairItem) {
            const successQty = parseFloat(returnedMaterial.successQuantity) || 0;
            const failQty = parseFloat(returnedMaterial.failQuantity) || 0;
            
            // Update success and fail quantities in repair item
            await prisma.materialRepairItem.update({
              where: { id: repairItem.id },
              data: {
                success: successQty,
                fail: failQty,
                updatedAt: new Date()
              }
            });

            // Add successfully repaired materials back to stock
            if (successQty > 0) {
              switch (repair.from) {
                case 'store':
                  await prisma.storeMaterial.update({
                    where: {
                      store_id_material_id: {
                        store_id: repair.fromId,
                        material_id: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      stock: {
                        increment: successQty
                      }
                    }
                  });
                  break;

                case 'shop':
                  await prisma.shopMaterial.update({
                    where: {
                      shop_id_material_id: {
                        shop_id: repair.fromId,
                        material_id: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      stock: {
                        increment: successQty
                      }
                    }
                  });
                  break;

                case 'factory':
                  await prisma.factoryMaterial.update({
                    where: {
                      factoryId_materialId: {
                        factoryId: repair.fromId,
                        materialId: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      stock: {
                        increment: successQty
                      }
                    }
                  });
                  break;
              }
            }

            // Increase scrap count for failed repairs
            if (failQty > 0) {
              switch (repair.from) {
                case 'store':
                  await prisma.storeMaterial.update({
                    where: {
                      store_id_material_id: {
                        store_id: repair.fromId,
                        material_id: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      scrap: {
                        increment: failQty
                      }
                    }
                  });
                  break;

                case 'shop':
                  await prisma.shopMaterial.update({
                    where: {
                      shop_id_material_id: {
                        shop_id: repair.fromId,
                        material_id: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      scrap: {
                        increment: failQty
                      }
                    }
                  });
                  break;

                case 'factory':
                  await prisma.factoryMaterial.update({
                    where: {
                      factoryId_materialId: {
                        factoryId: repair.fromId,
                        materialId: parseInt(returnedMaterial.materialId)
                      }
                    },
                    data: {
                      scrap: {
                        increment: failQty
                      }
                    }
                  });
                  break;
              }
            }
          }
        }
      }

      return updatedRepair;
    });

    res.json({
      message: 'Material repair status updated successfully',
      repair: result
    });
  } catch (error) {
    console.error('Error updating material repair status:', error);
    res.status(500).json({ error: 'Failed to update material repair status' });
  }
});

// Delete material repair request
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if repair exists and is not completed
    const repair = await prisma.materialRepair.findUnique({
      where: { id: parseInt(id) }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Material repair request not found' });
    }

    if (repair.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed repair request' });
    }

    await prisma.materialRepair.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Material repair request deleted successfully' });
  } catch (error) {
    console.error('Error deleting material repair request:', error);
    res.status(500).json({ error: 'Failed to delete material repair request' });
  }
});

module.exports = router;