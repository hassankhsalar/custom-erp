const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');

const prisma = new PrismaClient();

// Get all factories for dropdown
router.get('/allfactories', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'factory');
      const factories = await prisma.factory.findMany({
        where: { id: { in: Array.from(scope.factories) } },
        select: { id: true, name: true }
      });
      return res.json(factories);
    }
    const factories = await prisma.factory.findMany({
      select: { id: true, name: true }
    });
    res.json(factories);
  } catch (error) {
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Get complete inventory for a specific factory (materials and products)
router.get('/inventory/:factoryId', async (req, res) => {
  const { factoryId } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(factoryId));

    // Get factory materials
    const factoryMaterials = await prisma.factoryMaterial.findMany({
      where: { factoryId: parseInt(factoryId) },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            unit: true,
            unit_cost: true,
            sale_price: true,
            description: true,
            brand: true,
            barcode: true
          }
        }
      }
    });

    // Get factory products
    const factoryProducts = await prisma.factoryProduct.findMany({
      where: { factoryId: parseInt(factoryId) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            wholesale_price: true,
            cost: true,
            description: true,
            category: true,
            barcode: true
          }
        }
      }
    });

    // Transform materials data
    const materials = factoryMaterials.map(fm => ({
      id: fm.material.id,
      name: fm.material.name,
      type: 'material',
      stock: fm.stock,
      avg_cost: fm.avg_cost,
      scrap: fm.scrap,
      unit: fm.material.unit,
      unit_cost: fm.material.unit_cost,
      sale_price: fm.material.sale_price,
      description: fm.material.description,
      brand: fm.material.brand,
      barcode: fm.material.barcode,
      batchDetails: fm.batchDetails
    }));

    // Transform products data
    const products = factoryProducts.map(fp => ({
      id: fp.product.id,
      name: fp.product.name,
      type: 'product',
      stock: fp.stock,
      avg_cost: fp.avg_cost,
      scrap: fp.scrap,
      unit: 'pcs', // Products typically counted in pieces
      unit_cost: fp.product.cost,
      sale_price: fp.product.sale_price,
      wholesale_price: fp.product.wholesale_price,
      description: fp.product.description,
      category: fp.product.category,
      barcode: fp.product.barcode,
      batchDetails: fp.batchDetails
    }));

    // Combine and return both
    const inventory = [...materials, ...products];
    
    // Also return summary statistics
    const summary = {
      totalMaterials: materials.length,
      totalProducts: products.length,
      totalItems: inventory.length,
      totalStockValue: inventory.reduce((sum, item) => sum + (item.stock * (item.avg_cost || 0)), 0)
    };

    res.json({
      factoryId: parseInt(factoryId),
      summary,
      inventory
    });
  } catch (error) {
    if (error.status === 403) {
      return res.json({ inventory: [], summary: { totalItems: 0 } });
    }
    console.error('Error fetching factory inventory:', error);
    res.status(500).json({ error: 'Failed to fetch factory inventory' });
  }
});

// Get inventory summary by category
router.get('/inventory/:factoryId/summary', async (req, res) => {
  const { factoryId } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(factoryId));

    // Get materials summary
    const materialsSummary = await prisma.factoryMaterial.aggregate({
      where: { factoryId: parseInt(factoryId) },
      _count: true,
      _sum: {
        stock: true,
        scrap: true
      }
    });

    // Get products summary
    const productsSummary = await prisma.factoryProduct.aggregate({
      where: { factoryId: parseInt(factoryId) },
      _count: true,
      _sum: {
        stock: true,
        scrap: true
      }
    });

    // Get low stock items (stock <= 10)
    const lowStockMaterials = await prisma.factoryMaterial.findMany({
      where: { 
        factoryId: parseInt(factoryId),
        stock: { lte: 10 }
      },
      include: {
        material: { select: { name: true, unit: true } }
      },
      take: 5
    });

    const lowStockProducts = await prisma.factoryProduct.findMany({
      where: { 
        factoryId: parseInt(factoryId),
        stock: { lte: 10 }
      },
      include: {
        product: { select: { name: true } }
      },
      take: 5
    });

    res.json({
      materials: {
        count: materialsSummary._count,
        totalStock: materialsSummary._sum.stock || 0,
        totalScrap: materialsSummary._sum.scrap || 0
      },
      products: {
        count: productsSummary._count,
        totalStock: productsSummary._sum.stock || 0,
        totalScrap: productsSummary._sum.scrap || 0
      },
      lowStock: {
        materials: lowStockMaterials.map(m => ({
          name: m.material.name,
          stock: m.stock,
          unit: m.material.unit
        })),
        products: lowStockProducts.map(p => ({
          name: p.product.name,
          stock: p.stock,
          unit: 'pcs'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ error: 'Failed to fetch inventory summary' });
  }
});


// Get all factories
router.get('/', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'factory');
      const factories = await prisma.factory.findMany({
        where: { id: { in: Array.from(scope.factories) } }
      });
      return res.json(factories);
    }
    const factories = await prisma.factory.findMany();
    res.json(factories);
  } catch (error) {
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create a new factory
router.post('/', async (req, res) => {
  const { name, phone, manager, email, address } = req.body;
  const factory = await prisma.factory.create({
    data: {
      name,
      phone,
      manager,
      email,
      address,
    },
  });
  res.json(factory);
});

// Get a single factory
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const scope = await buildScope(prisma, req.user.userId);
      ensureIdScope(scope, 'factory', parseInt(id));
      const factory = await prisma.factory.findUnique({
          where: {
              id: parseInt(id),
          },
      });
      res.json(factory);
    } catch (error) {
      if (error.status === 403) {
        return res.json(null);
      }
      res.status(error.status || 500).json({ error: error.message });
    }
});

// Get factory materials with stock and avg_cost
router.get('/:id/materials', async (req, res) => {
  const { id } = req.params;
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(id));
    const materials = await prisma.factoryMaterial.findMany({
      where: { factoryId: parseInt(id) },
      include: {
        material: {
          select: { id: true, name: true, unit: true, unit_cost: true }
        }
      }
    });
    res.json(materials);
  } catch (error) {
    if (error.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch factory materials' });
  }
});

// Update a factory
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, manager, email, address } = req.body;
  const factory = await prisma.factory.update({
    where: {
      id: parseInt(id),
    },
    data: {
      name,
      phone,
      manager,
      email,
      address,
    },
  });
  res.json(factory);
});

// Delete a factory
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.factory.delete({
    where: {
      id: parseInt(id),
    },
  });
  res.json({ message: 'Factory deleted successfully' });
});





module.exports = router;
