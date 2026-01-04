const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// Get all shops for POS
router.get("/shops", async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        shop_keeper: true,
        mobile: true
      },
      orderBy: { name: "asc" }
    });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unified items (products + materials) for a specific shop
router.get("/items/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { search } = req.query;
    
    // Fetch shop products
    const shopProducts = await prisma.shopProduct.findMany({
      where: { 
        shop_id: parseInt(shopId),
        ...(search ? {
          product: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } }
            ]
          }
        } : {})
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            wholesale_price: true,
            barcode: true,
            category: true,
            stock: true,
            image: true
          }
        }
      }
    });

    // Fetch shop materials
    const shopMaterials = await prisma.shopMaterial.findMany({
      where: { 
        shop_id: parseInt(shopId),
        ...(search ? {
          material: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }
        } : {})
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            unit_cost: true,
            barcode: true,
            brand: true,
            unit: true,
            current_stock: true,
            image: true
          }
        }
      }
    });

    // Transform the data to unified format
    const products = shopProducts.map(sp => ({
      id: sp.product.id,
      name: sp.product.name,
      type: "product",
      sale_price: sp.product.sale_price,
      wholesale_price: sp.product.wholesale_price,
      cost_price: null, // Products don't have unit_cost in schema
      barcode: sp.product.barcode,
      category: sp.product.category,
      brand: null,
      unit: null, // Products don't have unit in schema
      stock: sp.stock,
      shop_stock: sp.stock,
      global_stock: sp.product.stock,
      image: sp.product.image,
      minStock: 0 // You might want to add this field later
    }));

    const materials = shopMaterials.map(sm => ({
      id: sm.material.id,
      name: sm.material.name,
      type: "material",
      sale_price: sm.material.sale_price,
      wholesale_price: null, // Materials don't have wholesale_price
      cost_price: sm.material.unit_cost,
      barcode: sm.material.barcode,
      category: null,
      brand: sm.material.brand,
      unit: sm.material.unit,
      stock: sm.stock,
      shop_stock: sm.stock,
      global_stock: sm.material.current_stock,
      image: sm.material.image,
      minStock: 0
    }));

    // Combine and sort by name
    const items = [...products, ...materials].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new sale for shop (updated for products & materials)
router.post("/", async (req, res) => {
  try {
    const { shopId, customer, paymentType, discount, items } = req.body;

    // Validate required fields
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Shop ID and at least one item are required" });
    }

    // Validate items
    for (const item of items) {
      if (!item.type || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: "Each item must have type, quantity, and unitPrice" });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
      if (!['product', 'material'].includes(item.type)) {
        return res.status(400).json({ error: "Item type must be 'product' or 'material'" });
      }
      if (!item.itemId) {
        return res.status(400).json({ error: "Each item must have itemId" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate totals
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const grandTotal = Math.max(0, totalAmount - (parseFloat(discount) || 0));

      // Generate reference
      const reference = `SHOP-SALE-${Date.now()}`;

      // Create the sale
      const sale = await tx.sale.create({
        data: {
          reference,
          shopId: parseInt(shopId),
          customer: customer?.trim() || null,
          totalAmount,
          discount: parseFloat(discount) || 0,
          grandTotal,
          paymentType: paymentType || "cash",
        },
      });

      // Process each sale item
      const saleItems = [];
      
      for (const item of items) {
        // Check stock based on item type
        if (item.type === "product") {
          // Check and update shop product stock
          const shopProduct = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.itemId),
              },
            },
          });

          if (!shopProduct) {
            throw new Error(`Product ${item.itemId} not found in shop ${shopId}`);
          }

          if (shopProduct.stock < parseFloat(item.quantity)) {
            throw new Error(`Insufficient stock for product ${item.itemId}. Available: ${shopProduct.stock}, Requested: ${item.quantity}`);
          }

          // Update shop product stock
          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.itemId),
              },
            },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

          // Update global product stock
          await tx.product.update({
            where: { id: parseInt(item.itemId) },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

        } else if (item.type === "material") {
          // Check and update shop material stock
          const shopMaterial = await tx.shopMaterial.findUnique({
            where: {
              shop_id_material_id: {
                shop_id: parseInt(shopId),
                material_id: parseInt(item.itemId),
              },
            },
          });

          if (!shopMaterial) {
            throw new Error(`Material ${item.itemId} not found in shop ${shopId}`);
          }

          if (shopMaterial.stock < parseFloat(item.quantity)) {
            throw new Error(`Insufficient stock for material ${item.itemId}. Available: ${shopMaterial.stock}, Requested: ${item.quantity}`);
          }

          // Update shop material stock
          await tx.shopMaterial.update({
            where: {
              shop_id_material_id: {
                shop_id: parseInt(shopId),
                material_id: parseInt(item.itemId),
              },
            },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

          // Update global material stock
          await tx.material.update({
            where: { id: parseInt(item.itemId) },
            data: {
              current_stock: { decrement: parseFloat(item.quantity) },
            },
          });
        }

        // Create sale item record - FIXED
        const saleItemData = {
          saleId: sale.id,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        };

        // Set productId or materialId based on type
        if (item.type === "product") {
          saleItemData.productId = parseInt(item.itemId);
        } else if (item.type === "material") {
          saleItemData.materialId = parseInt(item.itemId);
        }

        // Create sale item
        const saleItem = await tx.saleItem.create({
          data: saleItemData,
        });

        saleItems.push(saleItem);
      }

      return { sale, saleItems };
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale: result.sale,
      items: result.saleItems,
    });

  } catch (err) {
    console.error("Sale creation error:", err);
    
    if (err.message.includes("Insufficient stock") || err.message.includes("not found in shop")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Get all shop sales with both product and material details
router.get("/", async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { shopId: { not: null } },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            shop_keeper: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                sale_price: true,
              },
            },
            material: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unit: true,
                sale_price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single shop sale by ID
router.get("/:id", async (req, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { 
        id: parseInt(req.params.id),
        shopId: { not: null }
      },
      include: {
        shop: true,
        saleItems: {
          include: {
            product: true,
            material: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: "Shop sale not found" });
    }

    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Sale Return Route (Shop Only)
router.post("/return", async (req, res) => {
  try {
    const { saleId, items } = req.body;

    // Validate required fields
    if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Sale ID and at least one return item are required" });
    }

    // Validate each return item
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: "Each return item must have productId, quantity, and unitPrice" });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the original sale to validate
      const originalSale = await tx.sale.findUnique({
        where: { id: parseInt(saleId) },
        include: {
          saleItems: true,
          shop: true
        }
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      if (!originalSale.shopId) {
        throw new Error("This sale is not associated with a shop");
      }

      // Validate return items against original sale
      for (const returnItem of items) {
        const originalItem = originalSale.saleItems.find(
          item => item.productId === parseInt(returnItem.productId)
        );

        if (!originalItem) {
          throw new Error(`Product ${returnItem.productId} was not part of the original sale`);
        }

        if (returnItem.quantity > originalItem.quantity) {
          throw new Error(`Cannot return more than originally sold for product ${returnItem.productId}. Original: ${originalItem.quantity}, Return: ${returnItem.quantity}`);
        }
      }

      // Calculate total return amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Generate return reference
      const reference = `RETURN-${Date.now()}`;

      // Create sale return
      const saleReturn = await tx.saleReturn.create({
        data: {
          reference,
          saleId: parseInt(saleId),
          shopId: originalSale.shopId,
          totalAmount,
          returnItems: {
            create: items.map(item => ({
              productId: parseInt(item.productId),
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
            }))
          }
        },
        include: {
          returnItems: {
            include: {
              product: true
            }
          },
          shop: true
        }
      });

      // Restore shop stock
      for (const item of items) {
        const existingShopStock = await tx.shopProduct.findUnique({
          where: {
            shop_id_product_id: {
              shop_id: originalSale.shopId,
              product_id: parseInt(item.productId)
            }
          }
        });

        if (existingShopStock) {
          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: originalSale.shopId,
                product_id: parseInt(item.productId)
              }
            },
            data: {
              stock: { increment: parseFloat(item.quantity) }
            }
          });
        } else {
          // Create shop product record if it doesn't exist
          await tx.shopProduct.create({
            data: {
              shop_id: originalSale.shopId,
              product_id: parseInt(item.productId),
              stock: parseFloat(item.quantity)
            }
          });
        }

        // Update global product stock
        await tx.product.update({
          where: { id: parseInt(item.productId) },
          data: {
            stock: { increment: parseFloat(item.quantity) }
          }
        });
      }

      return { saleReturn };
    });

    res.status(201).json({
      message: "Return processed successfully",
      return: result.saleReturn
    });

  } catch (err) {
    console.error("Return processing error:", err);
    
    if (err.message.includes("Sale not found") || 
        err.message.includes("not associated with a shop") ||
        err.message.includes("was not part of the original sale") ||
        err.message.includes("Cannot return more than originally sold")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to process return: " + err.message });
  }
});

// Get all sale returns
router.get("/returns", async (req, res) => {
  try {
    const saleReturns = await prisma.saleReturn.findMany({
      where: { shopId: { not: null } },
      include: {
        sale: {
          include: {
            shop: true
          }
        },
        returnItems: {
          include: {
            product: true
          }
        },
        shop: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(saleReturns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get all sale returns with detailed information
router.get("/returns/all", async (req, res) => {
  try {
    const saleReturns = await prisma.saleReturn.findMany({
      where: { shopId: { not: null } },
      include: {
        sale: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            shop_keeper: true
          }
        },
        returnItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                category: true,
                sale_price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(saleReturns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sale returns statistics
router.get("/returns/stats", async (req, res) => {
  try {
    const totalReturns = await prisma.saleReturn.count({
      where: { shopId: { not: null } }
    });

    const totalReturnAmount = await prisma.saleReturn.aggregate({
      where: { shopId: { not: null } },
      _sum: {
        totalAmount: true
      }
    });

    const recentReturns = await prisma.saleReturn.findMany({
      where: { shopId: { not: null } },
      include: {
        shop: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            returnItems: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    res.json({
      totalReturns,
      totalReturnAmount: totalReturnAmount._sum.totalAmount || 0,
      recentReturns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;