const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');

// Generate unique reference for transactions
const generateTransactionReference = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TXN-${timestamp}-${random}`;
};

// Helper function to calculate due amount and status
const calculatePurchaseStatus = (purchase) => {
  const grandTotal = parseFloat(purchase.grandTotal) || 0;
  const paidAmount = parseFloat(purchase.paidAmount) || 0;
  const dueAmount = Math.max(0, grandTotal - paidAmount);
  
  let status = 'pending';
  if (dueAmount === 0) {
    status = 'paid';
  } else if (paidAmount > 0) {
    status = 'partial';
  }
  
  return { dueAmount, status };
};

// ➕ Add Purchase (Updated to support both products and materials)
router.post("/", async (req, res) => {
  try {
    const { 
      supplierId, 
      destinationType = "store", 
      destinationId, 
      grandTotal, 
      shippingCost = 0,
      discount = 0,
      tax = 0,
      paidAmount = 0,
      paymentMethod = "cash",
      bankAccountId,
      reference, 
      items 
    } = req.body;

    // Validate required fields
    let actualDestinationType = destinationType;
    let actualDestinationId = null;

    // Handle both old and new formats (remove storeId support gradually)
    if (destinationId) {
      // New format: destinationId provided
      actualDestinationId = parseInt(destinationId);
      actualDestinationType = destinationType || "store";
    } else {
      return res.status(400).json({ 
        error: "destinationId is required" 
      });
    }

    if (!supplierId || !actualDestinationId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Supplier, destination, and at least one item are required" 
      });
    }

    // Validate destination type
    if (!["store", "shop", "factory"].includes(actualDestinationType)) {
      return res.status(400).json({ 
        error: "Destination type must be store, shop, or factory" 
      });
    }

    // Validate that the destination exists
    await validateDestinationExists(actualDestinationType, actualDestinationId);

    // Validate each item
    for (const item of items) {
      if (!item.itemType || !["product", "material"].includes(item.itemType)) {
        return res.status(400).json({ 
          error: "Each item must have itemType (product or material)" 
        });
      }
      
      if (item.itemType === "product" && !item.productId) {
        return res.status(400).json({ 
          error: "Product items must have productId" 
        });
      }
      
      if (item.itemType === "material" && !item.materialId) {
        return res.status(400).json({ 
          error: "Material items must have materialId" 
        });
      }
      
      if (!item.quantity || !item.unitPrice) {
        return res.status(400).json({ 
          error: "Each item must have quantity and unitPrice" 
        });
      }
      
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ 
          error: "Quantity and unitPrice must be positive numbers" 
        });
      }
    }

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // Calculate discount amount
    const discountAmount = (discount / 100) * subtotal;
    
    // Calculate amount after discount
    const amountAfterDiscount = subtotal - discountAmount;
    
    // Calculate tax amount
    const taxAmount = (tax / 100) * amountAfterDiscount;
    
    // Calculate final grand total
    const calculatedGrandTotal = amountAfterDiscount + taxAmount + parseFloat(shippingCost);
    
    // Validate that paid amount is not greater than grand total
    if ((parseFloat(paidAmount) - calculatedGrandTotal) > 0 ) {
      return res.status(400).json({ 
        error: "Paid amount cannot exceed grand total from" 
      });
    }

    // Get the account associated with the destination
    const entityAccount = await prisma.entityAccount.findFirst({
      where: {
        entityType: actualDestinationType,
        entityId: actualDestinationId,
        isPrimary: true
      },
      include: {
        account: true
      }
    });

    if (!entityAccount) {
      let destinationName = getDestinationDetails(actualDestinationType, actualDestinationId);

      if (destinationName.name) {
        destinationName = destinationName.name.toUpperCase();
      } else {
        destinationName = "this " + actualDestinationType.toUpperCase();
      }

      return res.status(400).json({ 
        error: `No primary account found for ${destinationName}` 
      });
    }

    // Get current user from request (you may need to adjust this based on your auth setup)
    const userId = req.user?.userId || 1; // Default to admin if not available

    // Create purchase transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the purchase with new fields
      const purchase = await tx.purchase.create({
        data: {
          reference: reference || `PUR-${Date.now()}`,
          supplierId: parseInt(supplierId),
          destinationType: actualDestinationType,
          destinationId: actualDestinationId,
          grandTotal: calculatedGrandTotal,
          shippingCost: parseFloat(shippingCost),
          discount: parseFloat(discount),
          tax: parseFloat(tax),
          paidAmount: parseFloat(paidAmount),
        },
      });

      // 2. Create purchase items and update stock
      const purchaseItems = await Promise.all(
        items.map(async (item) => {
          const totalPrice = item.quantity * item.unitPrice;
          
          const purchaseItemData = {
            purchaseId: purchase.id,
            itemType: item.itemType,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice: totalPrice,
          };

          // Set productId or materialId based on item type
          if (item.itemType === "product") {
            purchaseItemData.productId = parseInt(item.productId);
          } else {
            purchaseItemData.materialId = parseInt(item.materialId);
          }

          const purchaseItem = await tx.purchaseItem.create({
            data: purchaseItemData,
            include: {
              product: true,
              material: true,
            },
          });

          // 3. Update stock based on destination type and item type
          if (item.itemType === "product") {
            await updateProductStock(
              tx, 
              actualDestinationType,
              actualDestinationId, 
              parseInt(item.productId), 
              parseFloat(item.quantity),
              parseFloat(item.unitPrice)
            );
          } else {
            await updateMaterialStock(
              tx, 
              actualDestinationType,
              actualDestinationId, 
              parseInt(item.materialId), 
              parseFloat(item.quantity),
              parseFloat(item.unitPrice)
            );
          }

          return purchaseItem;
        })
      );

      // 4. Create transaction record if paidAmount > 0
      if (parseFloat(paidAmount) > 0) {
        // Update account balance
        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: {
            balance: { decrement: parseFloat(paidAmount) } // Money going out
          }
        });

        let bankAccountRecord = null;
        if (["bank", "card", "bank_transfer"].includes((paymentMethod || "cash").toLowerCase()) && bankAccountId) {
          bankAccountRecord = await tx.bankAccount.update({
            where: { id: parseInt(bankAccountId) },
            data: {
              current_balance: { decrement: parseFloat(paidAmount) }
            }
          });
        }

        // Create transaction record
        await createTransaction(tx, {
          reference: `TRX-${Date.now()}`,
          createdById: userId,
          accountId: entityAccount.accountId,
          bankAccountId: bankAccountRecord ? bankAccountRecord.id : null,
          purchaseId: purchase.id,
          purpose: "Purchase Payment",
          added_to_account: false,
          amount: parseFloat(paidAmount),
          payment_method: paymentMethod || "cash",
          current_account_balance: updatedAccount.balance,
          note: `Payment for purchase ${purchase.reference}`
        });
      }

      return { purchase, purchaseItems };
    });

    res.status(201).json({
      message: "Purchase created successfully",
      purchase: {
        ...result.purchase,
        purchaseItems: result.purchaseItems,
      },
    });

  } catch (err) {
    console.error("Purchase creation error:", err);
    
    // Handle specific Prisma errors
    if (err.code === 'P2003') {
      return res.status(400).json({ 
        error: "Invalid supplier or destination ID" 
      });
    }
    
    if (err.code === 'P2025') {
      return res.status(404).json({ 
        error: "Destination or item not found" 
      });
    }
    
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Helper function to validate destination exists
async function validateDestinationExists(destinationType, destinationId) {
  switch (destinationType) {
    case "store":
      const store = await prisma.store.findUnique({
        where: { id: destinationId }
      });
      if (!store) throw new Error("Store not found");
      break;
      
    case "shop":
      const shop = await prisma.shop.findUnique({
        where: { id: destinationId }
      });
      if (!shop) throw new Error("Shop not found");
      break;
      
    case "factory":
      const factory = await prisma.factory.findUnique({
        where: { id: destinationId }
      });
      if (!factory) throw new Error("Factory not found");
      break;
      
    default:
      throw new Error("Invalid destination type");
  }
}

// Helper function to get destination details
async function getDestinationDetails(destinationType, destinationId) {
  if (!destinationType || !destinationId) return null;
  
  switch (destinationType) {
    case "store":
      return await prisma.store.findUnique({
        where: { id: destinationId },
        select: { id: true, name: true, address: true }
      });
      
    case "shop":
      return await prisma.shop.findUnique({
        where: { id: destinationId },
        select: { id: true, name: true, address: true }
      });
      
    case "factory":
      return await prisma.factory.findUnique({
        where: { id: destinationId },
        select: { id: true, name: true, address: true }
      });
      
    default:
      return null;
  }
}

// Helper function to update product stock
async function updateProductStock(tx, destinationType, destinationId, productId, quantity, unitPrice) {
  switch (destinationType) {
    case "store":
      await updateStoreProductStock(tx, destinationId, productId, quantity, unitPrice);
      break;
      
    case "shop":
      await updateShopProductStock(tx, destinationId, productId, quantity, unitPrice);
      break;
      
    case "factory":
      await updateFactoryProductStock(tx, destinationId, productId, quantity, unitPrice);
      break;
  }
}

// Helper function to update material stock
async function updateMaterialStock(tx, destinationType, destinationId, materialId, quantity, unitPrice) {
  switch (destinationType) {
    case "store":
      await updateStoreMaterialStock(tx, destinationId, materialId, quantity, unitPrice);
      break;
      
    case "shop":
      await updateShopMaterialStock(tx, destinationId, materialId, quantity, unitPrice);
      break;
      
    case "factory":
      await updateFactoryMaterialStock(tx, destinationId, materialId, quantity, unitPrice);
      break;
  }
}

// Store product stock update
async function updateStoreProductStock(tx, storeId, productId, quantity, unitPrice) {
  const existingStoreProduct = await tx.storeProduct.findUnique({
    where: {
      store_id_product_id: {
        store_id: storeId,
        product_id: productId,
      },
    },
  });

  if (existingStoreProduct) {
    const existingStock = parseFloat(existingStoreProduct.stock) || 0;
    const existingAvg = existingStoreProduct.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.storeProduct.update({
      where: {
        store_id_product_id: {
          store_id: storeId,
          product_id: productId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.storeProduct.create({
      data: {
        store_id: storeId,
        product_id: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Shop product stock update
async function updateShopProductStock(tx, shopId, productId, quantity, unitPrice) {
  const existingShopProduct = await tx.shopProduct.findUnique({
    where: {
      shop_id_product_id: {
        shop_id: shopId,
        product_id: productId,
      },
    },
  });

  if (existingShopProduct) {
    const existingStock = parseFloat(existingShopProduct.stock) || 0;
    const existingAvg = existingShopProduct.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.shopProduct.update({
      where: {
        shop_id_product_id: {
          shop_id: shopId,
          product_id: productId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.shopProduct.create({
      data: {
        shop_id: shopId,
        product_id: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Factory product stock update
async function updateFactoryProductStock(tx, factoryId, productId, quantity, unitPrice) {
  const existingFactoryProduct = await tx.factoryProduct.findUnique({
    where: {
      factoryId_productId: {
        factoryId: factoryId,
        productId: productId,
      },
    },
  });

  if (existingFactoryProduct) {
    const existingStock = parseFloat(existingFactoryProduct.stock) || 0;
    const existingAvg = existingFactoryProduct.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.factoryProduct.update({
      where: {
        factoryId_productId: {
          factoryId: factoryId,
          productId: productId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.factoryProduct.create({
      data: {
        factoryId: factoryId,
        productId: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Store material stock update (existing)
async function updateStoreMaterialStock(tx, storeId, materialId, quantity, unitPrice) {
  const existingStoreMaterial = await tx.storeMaterial.findUnique({
    where: {
      store_id_material_id: {
        store_id: storeId,
        material_id: materialId,
      },
    },
  });

  if (existingStoreMaterial) {
    const existingStock = parseFloat(existingStoreMaterial.stock) || 0;
    const existingAvg = existingStoreMaterial.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.storeMaterial.update({
      where: {
        store_id_material_id: {
          store_id: storeId,
          material_id: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.storeMaterial.create({
      data: {
        store_id: storeId,
        material_id: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Shop material stock update (existing)
async function updateShopMaterialStock(tx, shopId, materialId, quantity, unitPrice) {
  const existingShopMaterial = await tx.shopMaterial.findUnique({
    where: {
      shop_id_material_id: {
        shop_id: shopId,
        material_id: materialId,
      },
    },
  });

  if (existingShopMaterial) {
    const existingStock = parseFloat(existingShopMaterial.stock) || 0;
    const existingAvg = existingShopMaterial.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.shopMaterial.update({
      where: {
        shop_id_material_id: {
          shop_id: shopId,
          material_id: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.shopMaterial.create({
      data: {
        shop_id: shopId,
        material_id: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Factory material stock update (existing)
async function updateFactoryMaterialStock(tx, factoryId, materialId, quantity, unitPrice) {
  const existingFactoryMaterial = await tx.factoryMaterial.findUnique({
    where: {
      factoryId_materialId: {
        factoryId: factoryId,
        materialId: materialId,
      },
    },
  });

  if (existingFactoryMaterial) {
    const existingStock = parseFloat(existingFactoryMaterial.stock) || 0;
    const existingAvg = existingFactoryMaterial.avg_cost;
    const normalizedAvg = existingAvg === null || existingAvg === undefined
      ? parseFloat(unitPrice)
      : parseFloat(existingAvg);
    const totalQty = existingStock + quantity;
    const newAvgCost = totalQty > 0
      ? ((normalizedAvg * existingStock) + (unitPrice * quantity)) / totalQty
      : parseFloat(unitPrice);

    await tx.factoryMaterial.update({
      where: {
        factoryId_materialId: {
          factoryId: factoryId,
          materialId: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
        avg_cost: newAvgCost,
      },
    });
  } else {
    await tx.factoryMaterial.create({
      data: {
        factoryId: factoryId,
        materialId: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// GET all purchases with calculated due and status
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const usePagination = Number.isFinite(page) || Number.isFinite(limit);
    const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
    const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const skip = (pageNumber - 1) * limitNumber;

    const totalCount = usePagination ? await prisma.purchase.count() : null;

    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      skip: usePagination ? skip : undefined,
      take: usePagination ? limitNumber : undefined,
      include: {
        supplier: true,
        purchaseItems: {
          include: {
            material: true,
            product: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            account: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        account: true
        // REMOVED: store, shop, factory - these don't exist as direct relations
      }
    });

    // Fetch destination details for each purchase
    const purchasesWithDestinations = await Promise.all(
      purchases.map(async (purchase) => {
        let destination = null;
        
        // Fetch destination based on destinationType and destinationId
        if (purchase.destinationType && purchase.destinationId) {
          switch (purchase.destinationType) {
            case 'store':
              destination = await prisma.store.findUnique({
                where: { id: purchase.destinationId },
                select: { id: true, name: true, address: true }
              });
              break;
            case 'shop':
              destination = await prisma.shop.findUnique({
                where: { id: purchase.destinationId },
                select: { id: true, name: true, address: true }
              });
              break;
            case 'factory':
              destination = await prisma.factory.findUnique({
                where: { id: purchase.destinationId },
                select: { id: true, name: true, address: true }
              });
              break;
          }
        }

        const { dueAmount, status } = calculatePurchaseStatus(purchase);
        
        return {
          ...purchase,
          destination: destination ? {
            type: purchase.destinationType,
            ...destination
          } : null,
          dueAmount,
          status
        };
      })
    );

    if (usePagination) {
      const totalPages = Math.ceil(totalCount / limitNumber);
      return res.json({
        data: purchasesWithDestinations,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalCount,
          totalPages
        }
      });
    }

    res.json(purchasesWithDestinations);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// GET single purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
        purchaseItems: {
          include: {
            material: true,
            product: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            account: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            cashRegister: true,
            bankAccount: true
          }
        },
        account: true
        // REMOVED: store, shop, factory
      }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Fetch destination details
    let destination = null;
    if (purchase.destinationType && purchase.destinationId) {
      switch (purchase.destinationType) {
        case 'store':
          destination = await prisma.store.findUnique({
            where: { id: purchase.destinationId },
            select: { id: true, name: true, address: true }
          });
          break;
        case 'shop':
          destination = await prisma.shop.findUnique({
            where: { id: purchase.destinationId },
            select: { id: true, name: true, address: true }
          });
          break;
        case 'factory':
          destination = await prisma.factory.findUnique({
            where: { id: purchase.destinationId },
            select: { id: true, name: true, address: true }
          });
          break;
      }
    }

    // Add calculated fields
    const { dueAmount, status } = calculatePurchaseStatus(purchase);
    
    const formattedPurchase = {
      ...purchase,
      destination: destination ? {
        type: purchase.destinationType,
        ...destination
      } : null,
      dueAmount,
      status
    };

    res.json(formattedPurchase);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// PUT update purchase
router.put('/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const { 
      supplierId, 
      destinationType, 
      destinationId, 
      grandTotal, 
      shippingCost,
      discount,
      tax,
      items,
      accountId 
    } = req.body;

    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    });

    if (!existingPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if purchase has payments (cannot edit if paid)
    if (existingPurchase.paidAmount > 0) {
      return res.status(400).json({ error: 'Cannot edit purchase with existing payments' });
    }

    // Update purchase
    const updatedPurchase = await prisma.$transaction(async (prisma) => {
      // Delete existing items
      await prisma.purchaseItem.deleteMany({
        where: { purchaseId }
      });

      // Update purchase
      const purchase = await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          supplierId: supplierId ? parseInt(supplierId) : existingPurchase.supplierId,
          destinationType: destinationType || existingPurchase.destinationType,
          destinationId: destinationId ? parseInt(destinationId) : existingPurchase.destinationId,
          grandTotal: grandTotal ? parseFloat(grandTotal) : existingPurchase.grandTotal,
          shippingCost: shippingCost !== undefined ? parseFloat(shippingCost) : existingPurchase.shippingCost,
          discount: discount !== undefined ? parseFloat(discount) : existingPurchase.discount,
          tax: tax !== undefined ? parseFloat(tax) : existingPurchase.tax,
          accountId: accountId ? parseInt(accountId) : existingPurchase.accountId,
          purchaseItems: {
            create: items?.map(item => ({
              materialId: item.itemType === 'material' ? parseInt(item.itemId) : null,
              productId: item.itemType === 'product' ? parseInt(item.itemId) : null,
              itemType: item.itemType,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: parseFloat(item.totalPrice)
            })) || []
          }
        },
        include: {
          purchaseItems: {
            include: {
              material: true,
              product: true
            }
          },
          supplier: true,
          transactions: true
        }
      });

      return purchase;
    });

    // Add calculated fields
    const { dueAmount, status } = calculatePurchaseStatus(updatedPurchase);
    
    res.json({
      ...updatedPurchase,
      dueAmount,
      status
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    
    res.status(400).json({ error: error.message || 'Failed to update purchase' });
  }
});

// POST add payment to purchase
  router.post('/:id/payments', async (req, res) => {
    try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const { 
      amount, 
      payment_method, 
      accountId, 
      createdById,
      bankAccountId,
      cashRegisterId,
      note,
      purpose = 'Purchase Payment'
    } = req.body;

    // Validate required fields
    if (!amount || !payment_method || !accountId || !createdById) {
      return res.status(400).json({ 
        error: 'Amount, payment method, account ID, and user ID are required' 
      });
    }

    const paymentAmount = parseFloat(amount);
    
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    // Get purchase and account
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Get account to update balance
    const account = await prisma.accounts.findUnique({
      where: { id: parseInt(accountId) }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Calculate due amount
    const { dueAmount } = calculatePurchaseStatus(purchase);
    
    // Check if payment exceeds due amount
    if (paymentAmount > dueAmount) {
      return res.status(400).json({ 
        error: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds due amount ($${dueAmount.toFixed(2)})` 
      });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Calculate new paid amount
      const newPaidAmount = (parseFloat(purchase.paidAmount) || 0) + paymentAmount;
      
      // Update purchase paid amount
      const updatedPurchase = await prisma.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount
        }
      });

      // Update account balance (decrease balance when making payment)
      const newAccountBalance = (parseFloat(account.balance) || 0) - paymentAmount;
      
      await prisma.accounts.update({
        where: { id: parseInt(accountId) },
        data: {
          balance: newAccountBalance
        }
      });

      let bankAccountRecord = null;
      if (["bank", "card", "bank_transfer"].includes((payment_method || "cash").toLowerCase()) && bankAccountId) {
        bankAccountRecord = await prisma.bankAccount.update({
          where: { id: parseInt(bankAccountId) },
          data: { current_balance: { decrement: paymentAmount } }
        });
      }

      // Create transaction record
      const transaction = await createTransaction(prisma, {
        reference: generateTransactionReference(),
        createdById: parseInt(createdById),
        cashRegisterId: cashRegisterId ? parseInt(cashRegisterId) : null,
        bankAccountId: bankAccountRecord ? bankAccountRecord.id : (bankAccountId ? parseInt(bankAccountId) : null),
        accountId: parseInt(accountId),
        purchaseId: purchaseId,
        purpose: purpose,
        added_to_account: false,
        amount: paymentAmount,
        payment_method: payment_method,
        current_account_balance: newAccountBalance,
        note: note || `Payment for purchase ${purchase.reference}`
      });

      return {
        purchase: updatedPurchase,
        transaction,
        accountBalance: newAccountBalance
      };
    });

    // Calculate updated status
    const updatedPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const { dueAmount: updatedDueAmount, status } = calculatePurchaseStatus(updatedPurchase);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      purchase: {
        ...updatedPurchase,
        dueAmount: updatedDueAmount,
        status
      },
      transaction: result.transaction,
      newAccountBalance: result.accountBalance
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
});

// GET payment history for a purchase
router.get('/:id/payments', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    // Check if purchase exists
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Get all transactions for this purchase
    const transactions = await prisma.transactions.findMany({
      where: { purchaseId: purchaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        cashRegister: true,
        bankAccount: true
      }
    });

    // Calculate payment summary
    const totalPaid = transactions.reduce((sum, txn) => sum + (parseFloat(txn.amount) || 0), 0);
    const { dueAmount, status } = calculatePurchaseStatus(purchase);

    res.json({
      purchase: {
        ...purchase,
        dueAmount,
        status
      },
      payments: transactions,
      summary: {
        totalAmount: parseFloat(purchase.grandTotal) || 0,
        totalPaid,
        dueAmount,
        status
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// DELETE purchase (only if no payments made)
router.delete('/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    // Check if purchase exists
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if purchase has payments
    if (purchase.paidAmount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete purchase with existing payments. Refund payments first.' 
      });
    }

    // Delete in transaction
    await prisma.$transaction(async (prisma) => {
      // Delete purchase items first
      await prisma.purchaseItem.deleteMany({
        where: { purchaseId: purchaseId }
      });

      // Delete any transactions linked to this purchase
      await prisma.transactions.deleteMany({
        where: { purchaseId: purchaseId }
      });

      // Delete the purchase
      await prisma.purchase.delete({
        where: { id: purchaseId }
      });
    });

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting purchase:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to delete purchase' });
  }
});

// GET purchase statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        transactions: true
      }
    });

    // Calculate statistics
    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((sum, p) => sum + (parseFloat(p.grandTotal) || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0), 0);
    const totalDue = totalAmount - totalPaid;

    // Count by status
    const statusCounts = purchases.reduce((acc, purchase) => {
      const { status } = calculatePurchaseStatus(purchase);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalPurchases,
      totalAmount,
      totalPaid,
      totalDue,
      statusCounts,
      summary: {
        paidPercentage: totalAmount > 0 ? (totalPaid / totalAmount * 100).toFixed(2) : 0,
        duePercentage: totalAmount > 0 ? (totalDue / totalAmount * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching purchase stats:', error);
    res.status(500).json({ error: 'Failed to fetch purchase statistics' });
  }
});

// Add a new endpoint to get destination options
router.get("/destinations/:type", async (req, res) => {
  try {
    const { type } = req.params;
    
    let destinations = [];
    
    switch (type) {
      case "store":
        destinations = await prisma.store.findMany({
          select: { id: true, name: true, address: true }
        });
        break;
        
      case "shop":
        destinations = await prisma.shop.findMany({
          select: { id: true, name: true, address: true }
        });
        break;
        
      case "factory":
        destinations = await prisma.factory.findMany({
          select: { id: true, name: true, address: true }
        });
        break;
        
      default:
        return res.status(400).json({ 
          error: "Invalid destination type. Must be store, shop, or factory" 
        });
    }
    
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
