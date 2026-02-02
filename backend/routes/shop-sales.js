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
      cost_price: null,
      barcode: sp.product.barcode,
      category: sp.product.category,
      brand: null,
      unit: null,
      stock: sp.stock,
      shop_stock: sp.stock,
      global_stock: sp.product.stock,
      image: sp.product.image,
      minStock: 0
    }));

    const materials = shopMaterials.map(sm => ({
      id: sm.material.id,
      name: sm.material.name,
      type: "material",
      sale_price: sm.material.sale_price,
      wholesale_price: null,
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

        // Create sale item record
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

// Get sale return by ID - FIXED VERSION
router.get("/returns/:id", async (req, res) => {
  console.log(`📥 GET /returns/${req.params.id} called`);
  
  try {
    // Validate the ID parameter
    const returnId = parseInt(req.params.id);
    
    if (isNaN(returnId)) {
      return res.status(400).json({ 
        error: "Invalid return ID. Must be a number." 
      });
    }
    
    console.log(`Looking for sale return with ID: ${returnId}`);
    
    // Use findFirst instead of findUnique if findUnique is causing issues
    const saleReturn = await prisma.saleReturn.findFirst({
      where: { 
        id: returnId,  // Make sure this is correctly typed
        shopId: { not: null } // Additional filter if needed
      },
      include: {
        sale: {
          include: {
            shop: true,
            saleItems: {
              include: {
                product: true,
                material: true
              }
            }
          }
        },
        shop: true,
        returnItems: {
          include: {
            product: true,
            material: true
          }
        }
      }
    });

    console.log("Sale return found:", !!saleReturn);
    
    if (!saleReturn) {
      return res.status(404).json({ 
        error: `Sale return with ID ${returnId} not found` 
      });
    }

    res.json(saleReturn);
  } catch (err) {
    console.error(`❌ Error in /returns/${req.params.id}:`, err.message);
    console.error("Full error:", err);
    
    res.status(500).json({ 
      error: "Failed to fetch sale return",
      details: err.message 
    });
  }
});

// Get return-eligible sales for a shop (FIXED VERSION)
router.get("/return-eligible", async (req, res) => {
  try {
    const { shopId } = req.query;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    // Get all sales for the shop, then filter in JavaScript
    const allSales = await prisma.sale.findMany({
      where: {
        shopId: parseInt(shopId),
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter sales that are not returned
    // Handle both false boolean and 0 number
    const eligibleSales = allSales.filter(sale => {
      return sale.isReturned === false || 
             sale.isReturned === 0 || 
             sale.isReturned === null;
    });

    console.log(`Found ${allSales.length} total sales, ${eligibleSales.length} eligible for return`);
    
    res.json(eligibleSales);
  } catch (error) {
    console.error('Error fetching return-eligible sales:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales',
      details: error.message 
    });
  }
});

// Process a return (UPDATED VERSION)
router.post("/return", async (req, res) => {
  try {
    const { saleId, items } = req.body;

    // Validate required fields
    if (!saleId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Sale ID and at least one return item are required" });
    }

    // Validate each return item
    for (const item of items) {
      if (!item.type || !item.itemId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ 
          error: "Each return item must have type, itemId, quantity, and unitPrice" 
        });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
      if (!['product', 'material'].includes(item.type)) {
        return res.status(400).json({ error: "Item type must be 'product' or 'material'" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the original sale to validate
      const originalSale = await tx.sale.findUnique({
        where: { id: parseInt(saleId) },
        include: {
          saleItems: {
            include: {
              product: true,
              material: true
            }
          },
          shop: true
        }
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      if (!originalSale.shopId) {
        throw new Error("This sale is not associated with a shop");
      }

      // Check if sale is already returned
      if (originalSale.isReturned) {
        throw new Error("Sale has already been returned");
      }

      // Validate return items against original sale
      for (const returnItem of items) {
        const originalItem = originalSale.saleItems.find(item => {
          if (returnItem.type === "product") {
            return item.productId === parseInt(returnItem.itemId);
          } else {
            return item.materialId === parseInt(returnItem.itemId);
          }
        });

        if (!originalItem) {
          const itemType = returnItem.type === "product" ? "Product" : "Material";
          throw new Error(`${itemType} ${returnItem.itemId} was not part of the original sale`);
        }

        if (returnItem.quantity > originalItem.quantity) {
          const itemType = returnItem.type === "product" ? "Product" : "Material";
          throw new Error(`Cannot return more than originally sold for ${itemType} ${returnItem.itemId}. Original: ${originalItem.quantity}, Return: ${returnItem.quantity}`);
        }
      }

      // Calculate total return amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Generate return reference
      const reference = `SR-${Date.now()}`;

      // Create sale return with items
      const saleReturn = await tx.saleReturn.create({
        data: {
          reference,
          saleId: parseInt(saleId),
          shopId: originalSale.shopId,
          totalAmount,
          returnItems: {
            create: items.map(item => ({
              productId: item.type === "product" ? parseInt(item.itemId) : null,
              materialId: item.type === "material" ? parseInt(item.itemId) : null,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
            }))
          }
        },
        include: {
          returnItems: {
            include: {
              product: true,
              material: true
            }
          },
          shop: true
        }
      });

      // Update the sale as returned
      await tx.sale.update({
        where: { id: parseInt(saleId) },
        data: {
          isReturned: true,
          returnedAt: new Date(),
        },
      });

      // Restore shop stock based on item type
      for (const item of items) {
        if (item.type === "product") {
          // Restore shop product stock
          const existingShopStock = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: originalSale.shopId,
                product_id: parseInt(item.itemId)
              }
            }
          });

          if (existingShopStock) {
            await tx.shopProduct.update({
              where: {
                shop_id_product_id: {
                  shop_id: originalSale.shopId,
                  product_id: parseInt(item.itemId)
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
                product_id: parseInt(item.itemId),
                stock: parseFloat(item.quantity)
              }
            });
          }

          // Update global product stock
          await tx.product.update({
            where: { id: parseInt(item.itemId) },
            data: {
              stock: { increment: parseFloat(item.quantity) }
            }
          });

        } else if (item.type === "material") {
          // Restore shop material stock
          const existingShopStock = await tx.shopMaterial.findUnique({
            where: {
              shop_id_material_id: {
                shop_id: originalSale.shopId,
                material_id: parseInt(item.itemId)
              }
            }
          });

          if (existingShopStock) {
            await tx.shopMaterial.update({
              where: {
                shop_id_material_id: {
                  shop_id: originalSale.shopId,
                  material_id: parseInt(item.itemId)
                }
              },
              data: {
                stock: { increment: parseFloat(item.quantity) }
              }
            });
          } else {
            // Create shop material record if it doesn't exist
            await tx.shopMaterial.create({
              data: {
                shop_id: originalSale.shopId,
                material_id: parseInt(item.itemId),
                stock: parseFloat(item.quantity)
              }
            });
          }

          // Update global material stock
          await tx.material.update({
            where: { id: parseInt(item.itemId) },
            data: {
              current_stock: { increment: parseFloat(item.quantity) }
            }
          });
        }
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
        err.message.includes("has already been returned") ||
        err.message.includes("was not part of the original sale") ||
        err.message.includes("Cannot return more than originally sold")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: "Failed to process return: " + err.message });
  }
});

// NEW: Get all returns for the AllReturns page
router.get("/returns-list", async (req, res) => {
  
  try {
    const saleReturns = await prisma.saleReturn.findMany({
      where: { shopId: { not: null } },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            shop_keeper: true,
          },
        },
        sale: {
          select: {
            id: true,
            reference: true,
            customer: true,
            createdAt: true,
          },
        },
        returnItems: {
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

    res.json(saleReturns);
  } catch (err) {
    console.error("❌ Error in /returns-list:", err);
    res.status(500).json({ 
      error: "Failed to fetch returns",
      details: err.message 
    });
  }
});

// Get sale return by ID
router.get("/returns/:id", async (req, res) => {
  try {
    const saleReturn = await prisma.saleReturn.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        sale: {
          include: {
            shop: true,
            saleItems: {
              include: {
                product: true,
                material: true
              }
            }
          }
        },
        shop: true,
        returnItems: {
          include: {
            product: true,
            material: true
          }
        }
      }
    });

    if (!saleReturn) {
      return res.status(404).json({ error: "Sale return not found" });
    }

    res.json(saleReturn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get returns for a specific sale
router.get("/returns/sale/:saleId", async (req, res) => {
  try {
    const saleReturns = await prisma.saleReturn.findMany({
      where: { 
        saleId: parseInt(req.params.saleId)
      },
      include: {
        returnItems: {
          include: {
            product: true,
            material: true
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

// Get sale returns statistics (updated for materials)
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

    // Get unique shops with returns
    const shopsWithReturns = await prisma.saleReturn.groupBy({
      by: ['shopId'],
      where: { shopId: { not: null } },
      _count: {
        id: true
      }
    });

    const uniqueShopCount = shopsWithReturns.length;

    res.json({
      totalReturns,
      totalReturnAmount: totalReturnAmount._sum.totalAmount || 0,
      uniqueShopCount
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;