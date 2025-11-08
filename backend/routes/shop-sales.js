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

// Get products for a specific shop
router.get("/products/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const shopProducts = await prisma.shopProduct.findMany({
      where: { shop_id: parseInt(shopId) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sale_price: true,
            wholesale_price: true,
            barcode: true,
            category: true,
            stock: true
          }
        }
      }
    });

    // Transform the data to match frontend expectations
    const products = shopProducts.map(sp => ({
      id: sp.product.id,
      name: sp.product.name,
      sale_price: sp.product.sale_price,
      wholesale_price: sp.product.wholesale_price,
      barcode: sp.product.barcode,
      category: sp.product.category,
      stock: sp.stock // Use shop-specific stock
    }));

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new sale for shop
router.post("/", async (req, res) => {
  try {
    const { shopId, customer, paymentType, discount, items } = req.body;

    // Validate required fields
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Shop ID and at least one item are required" });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: "Each item must have productId, quantity, and unitPrice" });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
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

      // Create sale items and update shop stock
      const saleItems = await Promise.all(
        items.map(async (item) => {
          // Create sale item
          const saleItem = await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: parseInt(item.productId),
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
            },
          });

          // Update shop product stock
          const shopProduct = await tx.shopProduct.findUnique({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.productId),
              },
            },
          });

          if (!shopProduct) {
            throw new Error(`Product ${item.productId} not found in shop ${shopId}`);
          }

          if (shopProduct.stock < parseFloat(item.quantity)) {
            throw new Error(`Insufficient stock for product ${item.productId}. Available: ${shopProduct.stock}, Requested: ${item.quantity}`);
          }

          // Update shop stock
          await tx.shopProduct.update({
            where: {
              shop_id_product_id: {
                shop_id: parseInt(shopId),
                product_id: parseInt(item.productId),
              },
            },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

          // Update global product stock (optional)
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: {
              stock: { decrement: parseFloat(item.quantity) },
            },
          });

          return saleItem;
        })
      );

      return { sale, saleItems };
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale: result.sale,
      items: result.saleItems,
    });

  } catch (err) {
    console.error("Sale creation error:", err);
    
    if (err.message.includes("Insufficient stock")) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// Get all shop sales
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