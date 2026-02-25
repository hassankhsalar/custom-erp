const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { buildScope, ensureTypeScope, ensureIdScope } = require('../utils/associateScope');
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

router.get("/:id/inventory/list", async (req, res) => {
  try {
    const shopId = parseInt(req.params.id);
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 200);
    const search = String(req.query.search || "").trim().toLowerCase();
    const filterType = String(req.query.filterType || "all").toLowerCase();
    const category = String(req.query.category || "").trim().toLowerCase();
    const brand = String(req.query.brand || "").trim().toLowerCase();
    const unit = String(req.query.unit || "").trim().toLowerCase();
    const sortBy = String(req.query.sortBy || "name");
    const sortDir = String(req.query.sortDir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'shop', shopId);
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        shopProducts: { include: { product: { select: { id: true, name: true, sale_price: true, alert_quantity: true, barcode: true, category: true } } } },
        shopMaterials: { include: { material: { select: { id: true, name: true, unit: true, unit_cost: true, sale_price: true, alert_quantity: true, brand: true, barcode: true } } } }
      }
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const products = (shop.shopProducts || []).map((sp) => ({
      id: sp.product.id, name: sp.product.name, type: "product", stock: Number(sp.stock || 0), avg_cost: Number(sp.avg_cost || 0), scrap: Number(sp.scrap || 0), unit: "pcs",
      unit_cost: sp.unit_cost, sale_price: sp.sale_price ?? sp.product.sale_price, alert_quantity: sp.alert_quantity ?? sp.product.alert_quantity, description: sp.product.description, category: sp.product.category, barcode: sp.product.barcode
    }));
    const materials = (shop.shopMaterials || []).map((sm) => ({
      id: sm.material.id, name: sm.material.name, type: "material", stock: Number(sm.stock || 0), avg_cost: Number(sm.avg_cost || 0), scrap: Number(sm.scrap || 0), unit: sm.material.unit,
      unit_cost: sm.material.unit_cost, sale_price: sm.sale_price ?? sm.material.sale_price, alert_quantity: sm.alert_quantity ?? sm.material.alert_quantity, description: sm.material.description, brand: sm.material.brand, barcode: sm.material.barcode
    }));
    let rows = [...materials, ...products];
    if (filterType !== "all") rows = rows.filter((x) => x.type === filterType);
    if (search) rows = rows.filter((x) => String(x.name || "").toLowerCase().includes(search) || String(x.barcode || "").toLowerCase().includes(search) || String(x.category || "").toLowerCase().includes(search) || String(x.brand || "").toLowerCase().includes(search));
    if (category) rows = rows.filter((x) => String(x.category || "").toLowerCase().includes(category));
    if (brand) rows = rows.filter((x) => String(x.brand || "").toLowerCase().includes(brand));
    if (unit) rows = rows.filter((x) => String(x.unit || "").toLowerCase().includes(unit));
    const normalizedSortBy =
      sortBy === "damage" ? "scrap" :
      sortBy === "cost" ? "avg_cost" :
      sortBy;
    rows.sort((a, b) => {
      const av = a?.[normalizedSortBy]; const bv = b?.[normalizedSortBy];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    const totalCount = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);
    res.json({ items, pagination: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) } });
  } catch (err) {
    if (err.status === 403) return res.json({ items: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 1 } });
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/inventory/summary", async (req, res) => {
  try {
    const shopId = parseInt(req.params.id);
    const scope = await buildScope(prisma, req.user.userId);
    ensureIdScope(scope, 'shop', shopId);
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        shopProducts: { include: { product: { select: { name: true, alert_quantity: true } } } },
        shopMaterials: { include: { material: { select: { name: true, unit: true, alert_quantity: true } } } }
      }
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const materials = shop.shopMaterials || [];
    const products = shop.shopProducts || [];
    res.json({
      materials: { count: materials.length, totalStock: materials.reduce((s, m) => s + (Number(m.stock) || 0), 0), totalScrap: materials.reduce((s, m) => s + (Number(m.scrap) || 0), 0) },
      products: { count: products.length, totalStock: products.reduce((s, p) => s + (Number(p.stock) || 0), 0), totalScrap: products.reduce((s, p) => s + (Number(p.scrap) || 0), 0) },
      lowStock: {
        materials: materials.filter((m) => (Number(m.stock) || 0) <= (Number(m.alert_quantity ?? m.material?.alert_quantity ?? 10) || 10)).slice(0, 5).map((m) => ({ name: m.material?.name, stock: m.stock, unit: m.material?.unit || "" })),
        products: products.filter((p) => (Number(p.stock) || 0) <= (Number(p.alert_quantity ?? p.product?.alert_quantity ?? 10) || 10)).slice(0, 5).map((p) => ({ name: p.product?.name, stock: p.stock, unit: "pcs" })),
      }
    });
  } catch (err) {
    if (err.status === 403) return res.json({ materials: { count: 0, totalStock: 0, totalScrap: 0 }, products: { count: 0, totalStock: 0, totalScrap: 0 }, lowStock: { materials: [], products: [] } });
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
