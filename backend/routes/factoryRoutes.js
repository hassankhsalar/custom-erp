const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');
const { seedFactoryInventoryForAllItems } = require("../utils/inventoryBootstrap");
const { createInventoryAdjustmentAndMaybeAccount, toBoolean } = require('../utils/inventoryAdjustmentHelper');

const prisma = new PrismaClient();
const STOCK_EPSILON = 1e-9;
const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// Get all factories for dropdown
router.get('/allfactories', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'factory');
      const factories = await prisma.factory.findMany({
        where: { id: { in: Array.from(scope.factories) }, deleted_at: false },
        select: { id: true, name: true }
      });
      return res.json(factories);
    }
    const factories = await prisma.factory.findMany({
      where: { deleted_at: false },
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
            alert_quantity: true,
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
            alert_quantity: true,
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
      alert_quantity: fm.alert_quantity ?? fm.material.alert_quantity,
      scrap: fm.scrap,
      unit: fm.material.unit,
      unit_cost: fm.material.unit_cost,
      sale_price: fm.sale_price ?? fm.material.sale_price,
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
      alert_quantity: fp.alert_quantity ?? fp.product.alert_quantity,
      scrap: fp.scrap,
      unit: 'pcs', // Products typically counted in pieces
      unit_cost: fp.product.cost,
      sale_price: fp.sale_price ?? fp.product.sale_price,
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

router.get('/inventory/:factoryId/list', async (req, res) => {
  const { factoryId } = req.params;
  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 200);
  const search = String(req.query.search || '').trim().toLowerCase();
  const filterType = String(req.query.filterType || 'all').toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  const brand = String(req.query.brand || '').trim().toLowerCase();
  const unit = String(req.query.unit || '').trim().toLowerCase();
  const sortBy = String(req.query.sortBy || 'name');
  const sortDir = String(req.query.sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', parseInt(factoryId));

    const factoryMaterials = await prisma.factoryMaterial.findMany({
      where: { factoryId: parseInt(factoryId), deleted_at: false, material: { deleted_at: false } },
      include: { material: { select: { id: true, name: true, unit: true, unit_cost: true, sale_price: true, alert_quantity: true, description: true, brand: true, barcode: true } } }
    });
    const factoryProducts = await prisma.factoryProduct.findMany({
      where: { factoryId: parseInt(factoryId), deleted_at: false, product: { deleted_at: false } },
      include: { product: { select: { id: true, name: true, sale_price: true, wholesale_price: true, cost: true, alert_quantity: true, description: true, category: true, barcode: true } } }
    });

    const materials = factoryMaterials.map((fm) => ({
      id: fm.material.id,
      name: fm.material.name,
      type: 'material',
      stock: Number(fm.stock || 0),
      avg_cost: Number(fm.avg_cost || 0),
      alert_quantity: fm.alert_quantity ?? fm.material.alert_quantity,
      scrap: Number(fm.scrap || 0),
      unit: fm.material.unit,
      unit_cost: fm.material.unit_cost,
      sale_price: fm.sale_price ?? fm.material.sale_price,
      description: fm.material.description,
      brand: fm.material.brand,
      barcode: fm.material.barcode,
      batchDetails: fm.batchDetails
    }));
    const products = factoryProducts.map((fp) => ({
      id: fp.product.id,
      name: fp.product.name,
      type: 'product',
      stock: Number(fp.stock || 0),
      avg_cost: Number(fp.avg_cost || 0),
      alert_quantity: fp.alert_quantity ?? fp.product.alert_quantity,
      scrap: Number(fp.scrap || 0),
      unit: 'pcs',
      unit_cost: fp.product.cost,
      sale_price: fp.sale_price ?? fp.product.sale_price,
      wholesale_price: fp.product.wholesale_price,
      description: fp.product.description,
      category: fp.product.category,
      barcode: fp.product.barcode,
      batchDetails: fp.batchDetails
    }));

    let rows = [...materials, ...products];
    if (filterType !== 'all') rows = rows.filter((x) => x.type === filterType);
    if (search) {
      rows = rows.filter((x) => String(x.name || '').toLowerCase().includes(search) || String(x.barcode || '').toLowerCase().includes(search) || String(x.category || '').toLowerCase().includes(search) || String(x.brand || '').toLowerCase().includes(search));
    }
    if (category) rows = rows.filter((x) => String(x.category || '').toLowerCase().includes(category));
    if (brand) rows = rows.filter((x) => String(x.brand || '').toLowerCase().includes(brand));
    if (unit) rows = rows.filter((x) => String(x.unit || '').toLowerCase().includes(unit));

    const normalizedSortBy =
      sortBy === 'damage' ? 'scrap' :
      sortBy === 'cost' ? 'avg_cost' :
      sortBy;

    rows.sort((a, b) => {
      const av = a?.[normalizedSortBy];
      const bv = b?.[normalizedSortBy];
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return sortDir === 'asc' ? -1 : 1;
      if (bv === undefined) return sortDir === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

    const totalCount = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);
    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      }
    });
  } catch (error) {
    if (error.status === 403) return res.json({ items: [], pagination: { page: 1, limit, totalCount: 0, totalPages: 1 } });
    res.status(500).json({ error: 'Failed to fetch factory inventory list' });
  }
});

// Update factory inventory row (stock, sale_price, alert_quantity)
router.put('/inventory/:factoryId/item', async (req, res) => {
  const factoryId = parseInt(req.params.factoryId);
  const { itemType, itemId, stock, sale_price, alert_quantity, reason, date, isAccountAdjusted } = req.body || {};
  const parsedItemId = parseInt(itemId);
  const nextStock = toNullableNumber(stock);
  const nextSalePrice = toNullableNumber(sale_price);
  const nextAlertQuantity = toNullableNumber(alert_quantity);

  if (isNaN(factoryId) || !['product', 'material'].includes(String(itemType || '').toLowerCase()) || isNaN(parsedItemId)) {
    return res.status(400).json({ error: 'Invalid inventory update payload' });
  }
  if (nextStock === null || nextStock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'factory', factoryId);
    const normalizedItemType = String(itemType).toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      if (normalizedItemType === 'product') {
        const existing = await tx.factoryProduct.findFirst({
          where: { factoryId, productId: parsedItemId, deleted_at: false, product: { deleted_at: false } },
          include: { product: { select: { cost: true } } },
        });
        if (!existing) throw new Error('Inventory row not found');

        const prevStock = parseFloat(existing.stock) || 0;
        const updated = await tx.factoryProduct.update({
          where: { factoryId_productId: { factoryId, productId: parsedItemId } },
          data: {
            stock: nextStock,
            sale_price: nextSalePrice,
            alert_quantity: nextAlertQuantity,
          },
        });

        if (Math.abs(prevStock - nextStock) > STOCK_EPSILON) {
          await tx.stockAdjustment.create({
            data: {
              place: 'factory',
              factoryId,
              item: 'product',
              productId: parsedItemId,
              previous_stock: prevStock,
              after_edit: nextStock,
            },
          });
          await createInventoryAdjustmentAndMaybeAccount({
            tx,
            placeType: 'factory',
            placeId: factoryId,
            itemType: 'product',
            productId: parsedItemId,
            previousStock: prevStock,
            nextStock,
            unitPrice: Number(existing.avg_cost) || Number(existing.product?.cost) || 0,
            reason,
            date,
            isAccountAdjusted: toBoolean(isAccountAdjusted),
            createdById: req.user?.userId || null,
          });
        }
        return updated;
      }

      const existing = await tx.factoryMaterial.findFirst({
        where: { factoryId, materialId: parsedItemId, deleted_at: false, material: { deleted_at: false } },
        include: { material: { select: { unit_cost: true } } },
      });
      if (!existing) throw new Error('Inventory row not found');

      const prevStock = parseFloat(existing.stock) || 0;
      const updated = await tx.factoryMaterial.update({
        where: { factoryId_materialId: { factoryId, materialId: parsedItemId } },
        data: {
          stock: nextStock,
          sale_price: nextSalePrice,
          alert_quantity: nextAlertQuantity,
        },
      });

      if (Math.abs(prevStock - nextStock) > STOCK_EPSILON) {
        await tx.stockAdjustment.create({
          data: {
            place: 'factory',
            factoryId,
            item: 'material',
            materialId: parsedItemId,
            previous_stock: prevStock,
            after_edit: nextStock,
          },
        });
        await createInventoryAdjustmentAndMaybeAccount({
          tx,
          placeType: 'factory',
          placeId: factoryId,
          itemType: 'material',
          materialId: parsedItemId,
          previousStock: prevStock,
          nextStock,
          unitPrice: Number(existing.avg_cost) || Number(existing.material?.unit_cost) || 0,
          reason,
          date,
          isAccountAdjusted: toBoolean(isAccountAdjusted),
          createdById: req.user?.userId || null,
        });
      }
      return updated;
    });

    res.json({ success: true, row: result });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Inventory row not found') return res.status(404).json({ error: error.message });
    if (String(error.message || '').includes('No account assigned to this')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update factory inventory item' });
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
      where: { factoryId: parseInt(factoryId), deleted_at: false, material: { deleted_at: false } },
      _count: true,
      _sum: {
        stock: true,
        scrap: true
      }
    });

    // Get products summary
    const productsSummary = await prisma.factoryProduct.aggregate({
      where: { factoryId: parseInt(factoryId), deleted_at: false, product: { deleted_at: false } },
      _count: true,
      _sum: {
        stock: true,
        scrap: true
      }
    });

    // Low stock based on place-level alert first, then global alert fallback
    const lowStockMaterialRows = await prisma.factoryMaterial.findMany({
      where: { factoryId: parseInt(factoryId), deleted_at: false, material: { deleted_at: false } },
      include: {
        material: { select: { name: true, unit: true, alert_quantity: true } }
      },
    });

    const lowStockProductRows = await prisma.factoryProduct.findMany({
      where: { factoryId: parseInt(factoryId), deleted_at: false, product: { deleted_at: false } },
      include: {
        product: { select: { name: true, alert_quantity: true } }
      },
    });

    const lowStockMaterials = lowStockMaterialRows
      .filter((m) => (parseFloat(m.stock) || 0) <= (parseFloat(m.alert_quantity ?? m.material?.alert_quantity ?? 10) || 10))
      .slice(0, 5);

    const lowStockProducts = lowStockProductRows
      .filter((p) => (parseFloat(p.stock) || 0) <= (parseFloat(p.alert_quantity ?? p.product?.alert_quantity ?? 10) || 10))
      .slice(0, 5);

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
        where: { id: { in: Array.from(scope.factories) }, deleted_at: false }
      });
      return res.json(factories);
    }
    const factories = await prisma.factory.findMany({ where: { deleted_at: false } });
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
  const factory = await prisma.$transaction(async (tx) => {
    const created = await tx.factory.create({
      data: {
        name,
        phone,
        manager,
        email,
        address,
        deleted_at: false,
      },
    });

    await seedFactoryInventoryForAllItems(tx, created.id);
    return created;
  });

  res.json(factory);
});

// Get a single factory
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const scope = await buildScope(prisma, req.user.userId);
      ensureIdScope(scope, 'factory', parseInt(id));
      const factory = await prisma.factory.findFirst({
          where: {
              id: parseInt(id),
              deleted_at: false,
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
      where: { factoryId: parseInt(id), deleted_at: false, material: { deleted_at: false } },
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
  await prisma.$transaction(async (tx) => {
    await tx.factory.update({
      where: { id: parseInt(id) },
      data: { deleted_at: true },
    });
    await tx.factoryProduct.updateMany({
      where: { factoryId: parseInt(id) },
      data: { deleted_at: true },
    });
    await tx.factoryMaterial.updateMany({
      where: { factoryId: parseInt(id) },
      data: { deleted_at: true },
    });
  });
  res.json({ message: 'Factory deleted successfully' });
});





module.exports = router;
