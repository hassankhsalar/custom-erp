const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = 'your-secret-key';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/repair-documents';
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

// Create a product repair request
router.post('/', upload.single('document'), async (req, res) => {
  try {
    const { fromType, fromId, shippingCost, note, destination, products } = req.body;
    const documentPath = req.file ? req.file.path : null;

    // Parse products from JSON string
    const productsArray = JSON.parse(products);

    // Validate required fields
    if (!fromType || !fromId || !destination || !productsArray || productsArray.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the repair record
    const repairRecord = await prisma.$transaction(async (prisma) => {
      // Create the main repair record
      const repair = await prisma.productRepair.create({
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
        productsArray.map(async (product) => {
          return await prisma.productRepairItem.create({
            data: {
              repairId: repair.id,
              productId: parseInt(product.productId),
              quantity: parseFloat(product.quantity),
              success: parseFloat(product.success) || 0,
              fail: parseFloat(product.fail) || 0
            }
          });
        })
      );

      // Update scrap quantities in the source location
      for (const product of productsArray) {
        switch (fromType) {
          case 'store':
            await prisma.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: parseInt(fromId),
                  product_id: parseInt(product.productId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(product.quantity)
                }
              }
            });
            break;

          case 'shop':
            await prisma.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: parseInt(fromId),
                  product_id: parseInt(product.productId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(product.quantity)
                }
              }
            });
            break;

          case 'factory':
            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: parseInt(fromId),
                  productId: parseInt(product.productId)
                }
              },
              data: {
                scrap: {
                  decrement: parseFloat(product.quantity)
                }
              }
            });
            break;
        }
      }

      return { repair, repairItems };
    });

    res.status(201).json({
      message: 'Repair request created successfully',
      repairRecord
    });
  } catch (error) {
    console.error('Error creating repair request:', error);
    res.status(500).json({ error: 'Failed to create repair request' });
  }
});

// Get all repair requests
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const repairs = await prisma.productRepair.findMany({
      skip,
      take: limit,
      include: {
        productRepairItem: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRepairs = await prisma.productRepair.count();

    res.json({
      repairs,
      currentPage: page,
      totalPages: Math.ceil(totalRepairs / limit),
      totalItems: totalRepairs
    });
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    res.status(500).json({ error: 'Failed to fetch repair requests' });
  }
});

// Get single repair request by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const repair = await prisma.productRepair.findUnique({
      where: { id: parseInt(id) },
      include: {
        productRepairItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                cost: true,
                sale_price: true
              }
            }
          }
        }
      }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Repair request not found' });
    }

    res.json(repair);
  } catch (error) {
    console.error('Error fetching repair request:', error);
    res.status(500).json({ error: 'Failed to fetch repair request' });
  }
});

// Update repair status (when products return from repair)
// Update repair status (when products return from repair)
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, returnedProducts } = req.body; // returnedProducts: [{productId, successQuantity, failQuantity}]

  try {
    const repair = await prisma.productRepair.findUnique({
      where: { id: parseInt(id) },
      include: {
        productRepairItem: {
          include: {
            product: true
          }
        }
      }
    });

    if (!repair) {
      return res.status(404).json({ error: 'Repair request not found' });
    }

    // Validate status transition
    if (status === 'completed' && repair.status === 'completed') {
      return res.status(400).json({ error: 'Repair is already completed' });
    }

    // Validate returned products if provided
    if (returnedProducts && returnedProducts.length > 0) {
      for (const returnedProduct of returnedProducts) {
        const repairItem = repair.productRepairItem.find(
          item => item.productId === parseInt(returnedProduct.productId)
        );

        if (!repairItem) {
          return res.status(400).json({ error: `Product ${returnedProduct.productId} not found in this repair` });
        }

        const successQty = parseFloat(returnedProduct.successQuantity) || 0;
        const failQty = parseFloat(returnedProduct.failQuantity) || 0;
        const totalReturned = successQty + failQty;
        
        // Validate quantities
        if (totalReturned > repairItem.quantity) {
          return res.status(400).json({ 
            error: `Total returned quantity (${totalReturned}) exceeds sent quantity (${repairItem.quantity}) for product ${repairItem.product?.name || returnedProduct.productId}` 
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
      const updatedRepair = await prisma.productRepair.update({
        where: { id: parseInt(id) },
        data: {
          status: status || repair.status,
          updatedAt: new Date()
        },
        include: {
          productRepairItem: true
        }
      });

      // If products are returned, update stock in appropriate location
      if (returnedProducts && returnedProducts.length > 0) {
        for (const returnedProduct of returnedProducts) {
          const repairItem = repair.productRepairItem.find(
            item => item.productId === parseInt(returnedProduct.productId)
          );

          if (repairItem) {
            const successQty = parseFloat(returnedProduct.successQuantity) || 0;
            const failQty = parseFloat(returnedProduct.failQuantity) || 0;
            
            // Update success and fail quantities in repair item
            await prisma.productRepairItem.update({
              where: { id: repairItem.id },
              data: {
                success: successQty,
                fail: failQty,
                updatedAt: new Date()
              }
            });

            // Add successfully repaired products back to stock
            if (successQty > 0) {
              switch (repair.from) {
                case 'store':
                  await prisma.storeProduct.update({
                    where: {
                      store_id_product_id: {
                        store_id: repair.fromId,
                        product_id: parseInt(returnedProduct.productId)
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
                  await prisma.shopProduct.update({
                    where: {
                      shop_id_product_id: {
                        shop_id: repair.fromId,
                        product_id: parseInt(returnedProduct.productId)
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
                  await prisma.factoryProduct.update({
                    where: {
                      factoryId_productId: {
                        factoryId: repair.fromId,
                        productId: parseInt(returnedProduct.productId)
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
                  await prisma.storeProduct.update({
                    where: {
                      store_id_product_id: {
                        store_id: repair.fromId,
                        product_id: parseInt(returnedProduct.productId)
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
                  await prisma.shopProduct.update({
                    where: {
                      shop_id_product_id: {
                        shop_id: repair.fromId,
                        product_id: parseInt(returnedProduct.productId)
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
                  await prisma.factoryProduct.update({
                    where: {
                      factoryId_productId: {
                        factoryId: repair.fromId,
                        productId: parseInt(returnedProduct.productId)
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
      message: 'Repair status updated successfully',
      repair: result
    });
  } catch (error) {
    console.error('Error updating repair status:', error);
    res.status(500).json({ error: 'Failed to update repair status' });
  }
});

module.exports = router;