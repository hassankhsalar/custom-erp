const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to get product data based on branch type and ID
const getBranchProducts = async (branchType, branchId) => {
  switch (branchType) {
    case 'store':
      const storeProducts = await prisma.storeProduct.findMany({
        where: { store_id: parseInt(branchId) },
        include: {
          product: true
        }
      });
      return storeProducts.map(sp => ({
        id: sp.product.id,
        name: sp.product.name,
        barcode: sp.product.barcode,
        description: sp.product.description,
        image: sp.product.image,
        stock: sp.stock,
        cost: sp.avg_cost || sp.product.cost,
        sale_price: sp.product.sale_price,
        availableQuantity: sp.stock
      }));

    case 'shop':
      const shopProducts = await prisma.shopProduct.findMany({
        where: { shop_id: parseInt(branchId) },
        include: {
          product: true
        }
      });
      return shopProducts.map(sp => ({
        id: sp.product.id,
        name: sp.product.name,
        barcode: sp.product.barcode,
        description: sp.product.description,
        image: sp.product.image,
        stock: sp.stock,
        cost: sp.avg_cost || sp.product.cost,
        sale_price: sp.product.sale_price,
        availableQuantity: sp.stock
      }));

    case 'factory':
      const factoryProducts = await prisma.factoryProduct.findMany({
        where: { factoryId: parseInt(branchId) },
        include: {
          product: true
        }
      });
      return factoryProducts.map(fp => ({
        id: fp.product.id,
        name: fp.product.name,
        barcode: fp.product.barcode,
        description: fp.product.description,
        image: fp.product.image,
        stock: fp.stock,
        cost: fp.avg_cost || fp.product.cost,
        sale_price: fp.product.sale_price,
        availableQuantity: fp.stock
      }));

    default:
      return [];
  }
};

// GET products by branch - FIXED VERSION
router.get('/branch-products', async (req, res) => {
  try {
    // Accept parameters in different formats
    const branchType = req.query.type || req.query.branchType;
    const branchId = req.query.branchId || req.query.id;
    
    console.log('Received query:', req.query);
    console.log('Parsed params:', { branchType, branchId });

    if (!branchType || !branchId) {
      return res.status(400).json({ 
        error: 'Type and branch ID are required',
        message: 'Please provide both type and branchId parameters',
        received: req.query
      });
    }

    let products = [];
    const branchIdNum = parseInt(branchId);
    
    if (isNaN(branchIdNum)) {
      return res.status(400).json({ error: 'Invalid branch ID' });
    }

    switch (branchType.toLowerCase()) {
      case 'store':
        const storeProducts = await prisma.storeProduct.findMany({
          where: { store_id: branchIdNum },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                barcode: true,
                cost: true,
                sale_price: true,
                category: true
              }
            }
          }
        });
        
        products = storeProducts.map(sp => ({
          id: sp.product.id,
          name: sp.product.name,
          description: sp.product.description,
          image: sp.product.image,
          barcode: sp.product.barcode,
          cost: sp.product.cost,
          sale_price: sp.product.sale_price,
          category: sp.product.category,
          stock: sp.stock,
          availableQuantity: sp.stock,
          maxQuantity: sp.stock,
          avg_cost: sp.avg_cost || sp.product.cost
        }));
        break;

      case 'shop':
        const shopProducts = await prisma.shopProduct.findMany({
          where: { shop_id: branchIdNum },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                barcode: true,
                cost: true,
                sale_price: true,
                category: true
              }
            }
          }
        });
        
        products = shopProducts.map(sp => ({
          id: sp.product.id,
          name: sp.product.name,
          description: sp.product.description,
          image: sp.product.image,
          barcode: sp.product.barcode,
          cost: sp.product.cost,
          sale_price: sp.product.sale_price,
          category: sp.product.category,
          stock: sp.stock,
          availableQuantity: sp.stock,
          maxQuantity: sp.stock,
          avg_cost: sp.avg_cost || sp.product.cost
        }));
        break;

      case 'factory':
        const factoryProducts = await prisma.factoryProduct.findMany({
          where: { factoryId: branchIdNum },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                barcode: true,
                cost: true,
                sale_price: true,
                category: true
              }
            }
          }
        });
        
        products = factoryProducts.map(fp => ({
          id: fp.product.id,
          name: fp.product.name,
          description: fp.product.description,
          image: fp.product.image,
          barcode: fp.product.barcode,
          cost: fp.product.cost,
          sale_price: fp.product.sale_price,
          category: fp.product.category,
          stock: fp.stock,
          availableQuantity: fp.stock,
          maxQuantity: fp.stock,
          avg_cost: fp.avg_cost || fp.product.cost
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid branch type. Must be store, shop, or factory' });
    }

    console.log(`Found ${products.length} products for ${branchType} ${branchId}`);
    res.json(products);
  } catch (error) {
    console.error('Error fetching branch products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch branch products',
      details: error.message 
    });
  }
});

// Create a scrap record (UPDATED to update branch product stock)
router.post('/', async (req, res) => {
  const { fromType, fromBranchId, reason, note, products } = req.body;

  try {
    const totalLoss = products.reduce((sum, p) => sum + (p.quantity * p.lossPerUnit), 0);

    // Start a transaction to ensure data consistency
    const scrapRecord = await prisma.$transaction(async (prisma) => {
      // Create scrap record
      const record = await prisma.scrapProductRecord.create({
        data: {
          reason,
          note,
          fromType,
          fromBranchId: parseInt(fromBranchId),
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

      // Update stock in branch product table and increment scrap field
      for (const product of products) {
        const productId = parseInt(product.productId);
        const quantity = parseFloat(product.quantity);
        const fromBranchIdNum = parseInt(fromBranchId);

        switch (fromType) {
          case 'store':
            await prisma.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;

          case 'shop':
            await prisma.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;

          case 'factory':
            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: fromBranchIdNum,
                  productId: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;
        }
      }

      return record;
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
  const { reason, note, fromType, fromBranchId, products } = req.body;

  try {
    const totalLoss = products.reduce((sum, p) => sum + (p.quantity * p.lossPerUnit), 0);

    const updatedRecord = await prisma.$transaction(async (prisma) => {
      // Get old scrap products to restore stock
      const oldScrap = await prisma.scrapProduct.findMany({
        where: { scrapProductRecordId: parseInt(id) },
        include: { record: true }
      });

      // Restore old stock
      for (const oldProduct of oldScrap) {
        const fromBranchIdNum = parseInt(oldProduct.record.fromBranchId);
        const productId = oldProduct.productId;
        const quantity = oldProduct.quantity;

        switch (oldProduct.record.fromType) {
          case 'store':
            await prisma.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;

          case 'shop':
            await prisma.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;

          case 'factory':
            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: fromBranchIdNum,
                  productId: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;
        }
      }

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
          fromType,
          fromBranchId: parseInt(fromBranchId),
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

      // Update new stock
      for (const product of products) {
        const productId = parseInt(product.productId);
        const quantity = parseFloat(product.quantity);
        const fromBranchIdNum = parseInt(fromBranchId);

        switch (fromType) {
          case 'store':
            await prisma.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;

          case 'shop':
            await prisma.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;

          case 'factory':
            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: fromBranchIdNum,
                  productId: productId
                }
              },
              data: {
                stock: { decrement: quantity },
                scrap: { increment: quantity }
              }
            });
            break;
        }
      }

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
    await prisma.$transaction(async (prisma) => {
      // Get scrap products to restore stock
      const scrapProducts = await prisma.scrapProduct.findMany({
        where: { scrapProductRecordId: parseInt(id) },
        include: { record: true }
      });

      // Restore stock
      for (const scrapProduct of scrapProducts) {
        const fromBranchIdNum = parseInt(scrapProduct.record.fromBranchId);
        const productId = scrapProduct.productId;
        const quantity = scrapProduct.quantity;

        switch (scrapProduct.record.fromType) {
          case 'store':
            await prisma.storeProduct.update({
              where: {
                store_id_product_id: {
                  store_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;

          case 'shop':
            await prisma.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: fromBranchIdNum,
                  product_id: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;

          case 'factory':
            await prisma.factoryProduct.update({
              where: {
                factoryId_productId: {
                  factoryId: fromBranchIdNum,
                  productId: productId
                }
              },
              data: {
                stock: { increment: quantity },
                scrap: { decrement: quantity }
              }
            });
            break;
        }
      }

      // Delete scrap products
      await prisma.scrapProduct.deleteMany({
        where: { scrapProductRecordId: parseInt(id) }
      });

      // Delete scrap record
      await prisma.scrapProductRecord.delete({
        where: { id: parseInt(id) }
      });
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting scrap record:', error);
    res.status(500).json({ error: 'Failed to delete scrap record' });
  }
});

module.exports = router;