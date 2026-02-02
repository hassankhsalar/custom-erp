const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Get scrap materials by location
router.get('/', async (req, res) => {
  try {
    const { type, branchId } = req.query;

    if (!type || !branchId) {
      return res.status(400).json({ error: 'Type and branchId are required' });
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
          id: `store_${sm.store_id}_${sm.material_id}`,
          materialId: sm.material_id,
          material: sm.material,
          quantity: sm.scrap || 0,
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
          id: `shop_${sm.shop_id}_${sm.material_id}`,
          materialId: sm.material_id,
          material: sm.material,
          quantity: sm.scrap || 0,
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
          id: `factory_${fm.factoryId}_${fm.materialId}`,
          materialId: fm.materialId,
          material: fm.material,
          quantity: fm.scrap || 0,
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
    console.error('Error fetching scrap materials:', error);
    res.status(500).json({ error: 'Failed to fetch scrap materials' });
  }
});

module.exports = router;