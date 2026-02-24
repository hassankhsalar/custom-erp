const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');
const STOCK_EPSILON = 1e-9;
const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

// Get all shops
router.get("/", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, 'shop');
    }
    const shops = await prisma.shop.findMany({
      ...(scope?.isAdmin ? {} : { where: { id: { in: Array.from(scope.shops) } } }),
      include: {
        shopProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true,
                alert_quantity: true,
                barcode: true
              }
            }
          }
        },
        shopMaterials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                unit_cost: true
                ,sale_price: true,
                alert_quantity: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(shops);
  } catch (err) {
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// Get single shop by ID
router.get("/:id", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'shop', parseInt(req.params.id));
    const shop = await prisma.shop.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        shopProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true,
                alert_quantity: true,
                barcode: true,
                category: true
              }
            }
          }
        },
        shopMaterials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                unit_cost: true,
                sale_price: true,
                alert_quantity: true,
                brand: true
              }
            }
          }
        }
      }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json(shop);
  } catch (err) {
    if (err.status === 403) {
      return res.json(null);
    }
    res.status(500).json({ error: err.message });
  }
});

// Update shop inventory row (stock, sale_price, alert_quantity)
router.put('/inventory/:shopId/item', async (req, res) => {
  const shopId = parseInt(req.params.shopId);
  const { itemType, itemId, stock, sale_price, alert_quantity } = req.body || {};
  const parsedItemId = parseInt(itemId);
  const nextStock = toNullableNumber(stock);
  const nextSalePrice = toNullableNumber(sale_price);
  const nextAlertQuantity = toNullableNumber(alert_quantity);

  if (isNaN(shopId) || !['product', 'material'].includes(String(itemType || '').toLowerCase()) || isNaN(parsedItemId)) {
    return res.status(400).json({ error: 'Invalid inventory update payload' });
  }
  if (nextStock === null || nextStock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'shop', shopId);
    const normalizedItemType = String(itemType).toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      if (normalizedItemType === 'product') {
        const existing = await tx.shopProduct.findUnique({
          where: { shop_id_product_id: { shop_id: shopId, product_id: parsedItemId } },
        });
        if (!existing) throw new Error('Inventory row not found');

        const prevStock = parseFloat(existing.stock) || 0;
        const updated = await tx.shopProduct.update({
          where: { shop_id_product_id: { shop_id: shopId, product_id: parsedItemId } },
          data: {
            stock: nextStock,
            sale_price: nextSalePrice,
            alert_quantity: nextAlertQuantity,
          },
        });

        if (Math.abs(prevStock - nextStock) > STOCK_EPSILON) {
          await tx.stockAdjustment.create({
            data: {
              place: 'shop',
              shopId,
              item: 'product',
              productId: parsedItemId,
              previous_stock: prevStock,
              after_edit: nextStock,
            },
          });
        }
        return updated;
      }

      const existing = await tx.shopMaterial.findUnique({
        where: { shop_id_material_id: { shop_id: shopId, material_id: parsedItemId } },
      });
      if (!existing) throw new Error('Inventory row not found');

      const prevStock = parseFloat(existing.stock) || 0;
      const updated = await tx.shopMaterial.update({
        where: { shop_id_material_id: { shop_id: shopId, material_id: parsedItemId } },
        data: {
          stock: nextStock,
          sale_price: nextSalePrice,
          alert_quantity: nextAlertQuantity,
        },
      });

      if (Math.abs(prevStock - nextStock) > STOCK_EPSILON) {
        await tx.stockAdjustment.create({
          data: {
            place: 'shop',
            shopId,
            item: 'material',
            materialId: parsedItemId,
            previous_stock: prevStock,
            after_edit: nextStock,
          },
        });
      }
      return updated;
    });

    res.json({ success: true, row: result });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Inventory row not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: 'Failed to update shop inventory item' });
  }
});

// Create new shop
router.post("/", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { name, address, shop_keeper, mobile, shopProducts, shopMaterials } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Shop name is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the shop
      const shop = await tx.shop.create({
        data: {
          name,
          address,
          shop_keeper,
          mobile
        }
      });

      // Create shop products if provided
      if (shopProducts && shopProducts.length > 0) {
        await Promise.all(
          shopProducts.map(async (product) => {
            await tx.shopProduct.create({
              data: {
                shop_id: shop.id,
                product_id: product.product_id,
                stock: product.stock
              }
            });
          })
        );
      }

      // Create shop materials if provided
      if (shopMaterials && shopMaterials.length > 0) {
        await Promise.all(
          shopMaterials.map(async (material) => {
            await tx.shopMaterial.create({
              data: {
                shop_id: shop.id,
                material_id: material.material_id,
                stock: material.stock
              }
            });
          })
        );
      }

      return shop;
    });

    // Fetch the complete shop with relations
    const completeShop = await prisma.shop.findUnique({
      where: { id: result.id },
      include: {
        shopProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true
                ,alert_quantity: true
              }
            }
          }
        },
        shopMaterials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true
                ,sale_price: true,
                alert_quantity: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: "Shop created successfully",
      shop: completeShop
    });

  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Shop name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update shop
router.put("/:id", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { name, address, shop_keeper, mobile, shopProducts, shopMaterials } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Update shop basic info
      const shop = await tx.shop.update({
        where: { id: parseInt(req.params.id) },
        data: {
          name,
          address,
          shop_keeper,
          mobile
        }
      });

      // Update shop products
      if (shopProducts) {
        // Delete existing products
        await tx.shopProduct.deleteMany({
          where: { shop_id: parseInt(req.params.id) }
        });

        // Create new products
        if (shopProducts.length > 0) {
          await Promise.all(
            shopProducts.map(async (product) => {
              await tx.shopProduct.create({
                data: {
                  shop_id: parseInt(req.params.id),
                  product_id: product.product_id,
                  stock: product.stock
                }
              });
            })
          );
        }
      }

      // Update shop materials
      if (shopMaterials) {
        // Delete existing materials
        await tx.shopMaterial.deleteMany({
          where: { shop_id: parseInt(req.params.id) }
        });

        // Create new materials
        if (shopMaterials.length > 0) {
          await Promise.all(
            shopMaterials.map(async (material) => {
              await tx.shopMaterial.create({
                data: {
                  shop_id: parseInt(req.params.id),
                  material_id: material.material_id,
                  stock: material.stock
                }
              });
            })
          );
        }
      }

      return shop;
    });

    res.json({
      message: "Shop updated successfully",
      shop: result
    });

  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Shop not found" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete shop
router.delete("/:id", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    if (!scope.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.shop.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: "Shop deleted successfully" });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Shop not found" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get shop stock
router.get("/:id/stock", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'shop', parseInt(req.params.id));
    const shop = await prisma.shop.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        shopProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true,
                alert_quantity: true,
                barcode: true,
                category: true
              }
            }
          }
        },
        shopMaterials: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                unit: true,
                unit_cost: true,
                sale_price: true,
                alert_quantity: true,
                brand: true
              }
            }
          }
        }
      }
    });

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json({
      products: shop.shopProducts,
      materials: shop.shopMaterials
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
