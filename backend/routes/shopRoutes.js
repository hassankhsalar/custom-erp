const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// Get all shops
router.get("/", async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        shopProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sale_price: true,
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
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single shop by ID
router.get("/:id", async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});

// Create new shop
router.post("/", async (req, res) => {
  try {
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