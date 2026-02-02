const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();



// Get scrap products by location type and ID
router.get('/', async (req, res) => {
  const { type, branchId } = req.query;

  if (!type || !branchId) {
    return res.status(400).json({ error: 'Type and branchId are required' });
  }

  try {
    let scrapProducts = [];

    // Fetch scrap products based on location type
    switch (type) {
      case 'store':
        // Get store scrap products
        const storeProducts = await prisma.storeProduct.findMany({
          where: {
            store_id: parseInt(branchId),
            scrap: {
              gt: 0 // Only get products with scrap quantity > 0
            }
          },
          include: {
            product: true,
            store: true
          }
        });

        // Transform to match ScrapProduct format
        scrapProducts = storeProducts.map(sp => ({
          id: sp.store_id * 10000 + sp.product_id, // Create a unique ID for frontend
          productId: sp.product_id,
          product: sp.product,
          quantity: sp.scrap || 0,
          lossPerUnit: sp.product?.cost || 0,
          locationType: 'store',
          locationId: sp.store_id,
          locationName: sp.store?.name,
          updatedAt: new Date() // You might want to track when scrap was added
        }));
        break;

      case 'shop':
        // Get shop scrap products
        const shopProducts = await prisma.shopProduct.findMany({
          where: {
            shop_id: parseInt(branchId),
            scrap: {
              gt: 0
            }
          },
          include: {
            product: true,
            shop: true
          }
        });

        scrapProducts = shopProducts.map(sp => ({
          id: sp.shop_id * 10000 + sp.product_id,
          productId: sp.product_id,
          product: sp.product,
          quantity: sp.scrap || 0,
          lossPerUnit: sp.product?.cost || 0,
          locationType: 'shop',
          locationId: sp.shop_id,
          locationName: sp.shop?.name,
          updatedAt: new Date()
        }));
        break;

      case 'factory':
        // Get factory scrap products
        const factoryProducts = await prisma.factoryProduct.findMany({
          where: {
            factoryId: parseInt(branchId),
            scrap: {
              gt: 0
            }
          },
          include: {
            product: true,
            factory: true
          }
        });

        scrapProducts = factoryProducts.map(fp => ({
          id: fp.factoryId * 10000 + fp.productId,
          productId: fp.productId,
          product: fp.product,
          quantity: fp.scrap || 0,
          lossPerUnit: fp.product?.cost || 0,
          locationType: 'factory',
          locationId: fp.factoryId,
          locationName: fp.factory?.name,
          updatedAt: new Date()
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid type. Must be store, shop, or factory' });
    }

    res.json({
      scrapProducts,
      count: scrapProducts.length,
      type,
      branchId
    });
  } catch (error) {
    console.error('Error fetching scrap products:', error);
    res.status(500).json({ error: 'Failed to fetch scrap products' });
  }
});

module.exports = router;