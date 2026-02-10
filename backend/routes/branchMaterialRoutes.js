const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Get materials by branch/location
router.get('/', async (req, res) => {
  try {
    const { type, branchId } = req.query;

    console.log('Fetching materials for type:', type, 'branchId:', branchId);

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
              gt: 0 // Only materials with stock > 0
            }
          },
          include: {
            material: true
          }
        });

        materials = storeMaterials.map(sm => ({
          id: `store_${sm.store_id}_${sm.material_id}`,
          storeMaterialId: sm.id, // The actual ID from StoreMaterial table
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
          id: `shop_${sm.shop_id}_${sm.material_id}`,
          shopMaterialId: sm.id, // The actual ID from ShopMaterial table
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
          id: `factory_${fm.factoryId}_${fm.materialId}`,
          factoryMaterialId: fm.id, // The actual ID from FactoryMaterial table
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

    console.log(`Found ${materials.length} materials for ${type} ${branchId}`);

    res.json({
      success: true,
      materials,
      total: materials.length,
      type,
      branchId
    });
  } catch (error) {
    console.error('Error fetching materials by location:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch materials by location',
      details: error.message 
    });
  }
});

module.exports = router;