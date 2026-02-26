const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureHasAnyScope, ensureTypeScope, ensureIdScope, buildLocationOrFilter } = require('../utils/associateScope');
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');
const { createNotification } = require('../utils/notificationHelper');
const { rollbackAndDeleteTransactionsByWhere } = require('../utils/transactionRollback');
const { parseDateOnly, mergeIncomingBatch, decrementBatch, getAvailableBatches } = require('../utils/batchDetails');
const { assertActivePlace, assertActiveItem } = require('../utils/softDelete');

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

const calculateShippingStatusFromReceived = (items) => {
  if (!items || items.length === 0) return 'pending';
  let allZero = true;
  let allComplete = true;
  for (const item of items) {
    const qty = parseFloat(item.quantity) || 0;
    const received = parseFloat(item.receivedQuantity ?? item.received_quantity ?? 0) || 0;
    if (received > 0) allZero = false;
    if (received < qty) allComplete = false;
  }
  if (allComplete) return 'received';
  if (allZero) return 'pending';
  return 'partial';
};

const calculateShippingStatusFromTotals = (purchaseItems, receivedByItemId) => {
  if (!purchaseItems || purchaseItems.length === 0) return 'pending';
  let allZero = true;
  let allComplete = true;
  for (const item of purchaseItems) {
    const qty = parseFloat(item.quantity) || 0;
    const received = parseFloat(receivedByItemId[item.id] || 0);
    if (received > 0) allZero = false;
    if (received < qty) allComplete = false;
  }
  if (allComplete) return 'received';
  if (allZero) return 'pending';
  return 'partial';
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

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, actualDestinationType, actualDestinationId);

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
      await assertActiveItem(
        prisma,
        item.itemType,
        item.itemType === "product" ? item.productId : item.materialId
      );

      if (item.receivedQuantity !== undefined && item.receivedQuantity !== null) {
        const receivedQty = parseFloat(item.receivedQuantity);
        if (isNaN(receivedQty) || receivedQty < 0) {
          return res.status(400).json({
            error: "Received quantity must be a non-negative number"
          });
        }
        if (receivedQty > parseFloat(item.quantity)) {
          return res.status(400).json({
            error: "Received quantity cannot exceed ordered quantity"
          });
        }
      }
    }

    // Normalize numeric values once and reuse for calculations + persistence
    const shippingCostValue = parseFloat(shippingCost) || 0;
    const discountValue = parseFloat(discount) || 0;
    const taxValue = parseFloat(tax) || 0;
    const paidAmountValue = parseFloat(paidAmount) || 0;

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // Calculate discount amount
    const discountAmount = (discountValue / 100) * subtotal;
    
    // Calculate amount after discount
    const amountAfterDiscount = subtotal - discountAmount;
    
    // Calculate tax amount
    const taxAmount = (taxValue / 100) * amountAfterDiscount;
    
    // Calculate final grand total
    const calculatedGrandTotal = amountAfterDiscount + taxAmount + shippingCostValue;
    
    // Validate that paid amount is not greater than grand total
    if (paidAmountValue > calculatedGrandTotal + Number.EPSILON) {
      return res.status(400).json({ 
        error: "Paid amount cannot exceed grand total from" 
      });
    }

    const computedShippingStatus = calculateShippingStatusFromReceived(items);

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
          shippingCost: shippingCostValue,
          discount: discountValue,
          tax: taxValue,
          paidAmount: paidAmountValue,
          shippingStatus: computedShippingStatus,
        },
      });

      // 2. Create purchase items and update stock
      const purchaseItems = await Promise.all(
        items.map(async (item) => {
          const totalPrice = item.quantity * item.unitPrice;
          const receivedQty = item.receivedQuantity !== undefined && item.receivedQuantity !== null
            ? parseFloat(item.receivedQuantity)
            : parseFloat(item.quantity);
          
          const purchaseItemData = {
            purchaseId: purchase.id,
            itemType: item.itemType,
            selectedName: item.selectedName ? String(item.selectedName).trim() : null,
            selectedUnit: item.selectedUnit ? String(item.selectedUnit).trim() : null,
            selectedQuantity: item.selectedQuantity !== undefined && item.selectedQuantity !== null ? parseFloat(item.selectedQuantity) : null,
            batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
            batchNotes: item.batchNotes || null,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            totalPrice,
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
            if (receivedQty > 0) {
              await updateProductStock(
                tx,
                actualDestinationType,
                actualDestinationId,
                parseInt(item.productId),
                receivedQty,
                parseFloat(item.unitPrice),
                {
                  batchNumber: purchaseItemData.batchNumber,
                  expiryDate: purchaseItemData.expiryDate,
                  quantity: receivedQty,
                  unitCost: parseFloat(item.unitPrice),
                }
              );
            }
          } else {
            if (receivedQty > 0) {
              await updateMaterialStock(
                tx,
                actualDestinationType,
                actualDestinationId,
                parseInt(item.materialId),
                receivedQty,
                parseFloat(item.unitPrice),
                {
                  batchNumber: purchaseItemData.batchNumber,
                  expiryDate: purchaseItemData.expiryDate,
                  quantity: receivedQty,
                  unitCost: parseFloat(item.unitPrice),
                }
              );
            }
          }

          return { purchaseItem, receivedQty };
        })
      );

      const shipment = await tx.purchaseShipment.create({
        data: {
          purchaseId: purchase.id,
          reference: `SHIP-${Date.now()}`,
          status: computedShippingStatus,
          receivedAt: computedShippingStatus === 'received' ? new Date() : null
        }
      });

      const shipmentItemsData = purchaseItems.map(({ purchaseItem, receivedQty }) => ({
        shipmentId: shipment.id,
        purchaseItemId: purchaseItem.id,
        itemType: purchaseItem.itemType,
        materialId: purchaseItem.materialId,
        productId: purchaseItem.productId,
        quantity: receivedQty,
        received_quantity: receivedQty
      }));

      if (shipmentItemsData.length > 0) {
        await tx.purchaseShipmentItem.createMany({
          data: shipmentItemsData
        });
      }

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

    await createNotification(prisma, {
      title: `Purchase created (${result.purchase.reference || result.purchase.id})`,
      description: `A new purchase ${result.purchase.reference || result.purchase.id} was created.`,
      forRole: "admin",
      link: "/purchase/all"
    });

    res.status(201).json({
      message: "Purchase created successfully",
      purchase: {
        ...result.purchase,
        purchaseItems: result.purchaseItems.map((entry) => entry.purchaseItem),
      },
    });

  } catch (err) {
    console.error("Purchase creation error:", err);

    if (err.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
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
  await assertActivePlace(prisma, destinationType, destinationId);
}

// Helper function to get destination details
async function getDestinationDetails(destinationType, destinationId) {
  if (!destinationType || !destinationId) return null;
  
  switch (destinationType) {
    case "store":
      return await prisma.store.findFirst({
        where: { id: destinationId, deleted_at: false },
        select: { id: true, name: true, address: true }
      });
      
    case "shop":
      return await prisma.shop.findFirst({
        where: { id: destinationId, deleted_at: false },
        select: { id: true, name: true, address: true }
      });
      
    case "factory":
      return await prisma.factory.findFirst({
        where: { id: destinationId, deleted_at: false },
        select: { id: true, name: true, address: true }
      });
      
    default:
      return null;
  }
}

// Helper function to update product stock
async function updateProductStock(tx, destinationType, destinationId, productId, quantity, unitPrice, batchInfo = null) {
  switch (destinationType) {
    case "store":
      await updateStoreProductStock(tx, destinationId, productId, quantity, unitPrice, batchInfo);
      break;
      
    case "shop":
      await updateShopProductStock(tx, destinationId, productId, quantity, unitPrice, batchInfo);
      break;
      
    case "factory":
      await updateFactoryProductStock(tx, destinationId, productId, quantity, unitPrice, batchInfo);
      break;
  }
}

// Helper function to update material stock
async function updateMaterialStock(tx, destinationType, destinationId, materialId, quantity, unitPrice, batchInfo = null) {
  switch (destinationType) {
    case "store":
      await updateStoreMaterialStock(tx, destinationId, materialId, quantity, unitPrice, batchInfo);
      break;
      
    case "shop":
      await updateShopMaterialStock(tx, destinationId, materialId, quantity, unitPrice, batchInfo);
      break;
      
    case "factory":
      await updateFactoryMaterialStock(tx, destinationId, materialId, quantity, unitPrice, batchInfo);
      break;
  }
}

// Store product stock update
async function updateStoreProductStock(tx, storeId, productId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingStoreProduct.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.storeProduct.create({
      data: {
        store_id: storeId,
        product_id: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Shop product stock update
async function updateShopProductStock(tx, shopId, productId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingShopProduct.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.shopProduct.create({
      data: {
        shop_id: shopId,
        product_id: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Factory product stock update
async function updateFactoryProductStock(tx, factoryId, productId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingFactoryProduct.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.factoryProduct.create({
      data: {
        factoryId: factoryId,
        productId: productId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

// Store material stock update (existing)
async function updateStoreMaterialStock(tx, storeId, materialId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingStoreMaterial.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.storeMaterial.create({
      data: {
        store_id: storeId,
        material_id: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Shop material stock update (existing)
async function updateShopMaterialStock(tx, shopId, materialId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingShopMaterial.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.shopMaterial.create({
      data: {
        shop_id: shopId,
        material_id: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Factory material stock update (existing)
async function updateFactoryMaterialStock(tx, factoryId, materialId, quantity, unitPrice, batchInfo = null) {
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
        batchDetails: mergeIncomingBatch(existingFactoryMaterial.batchDetails, batchInfo),
      },
    });
  } else {
    await tx.factoryMaterial.create({
      data: {
        factoryId: factoryId,
        materialId: materialId,
        stock: quantity,
        avg_cost: parseFloat(unitPrice),
        batchDetails: mergeIncomingBatch(null, batchInfo),
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

async function decrementStoreProductStock(tx, storeId, productId, quantity, batchInfo = null) {
  const existing = await tx.storeProduct.findUnique({
    where: { store_id_product_id: { store_id: storeId, product_id: productId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient store product stock for product ${productId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.storeProduct.update({
    where: { store_id_product_id: { store_id: storeId, product_id: productId } },
    data: updateData
  });
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
}

async function decrementShopProductStock(tx, shopId, productId, quantity, batchInfo = null) {
  const existing = await tx.shopProduct.findUnique({
    where: { shop_id_product_id: { shop_id: shopId, product_id: productId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient shop product stock for product ${productId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.shopProduct.update({
    where: { shop_id_product_id: { shop_id: shopId, product_id: productId } },
    data: updateData
  });
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
}

async function decrementFactoryProductStock(tx, factoryId, productId, quantity, batchInfo = null) {
  const existing = await tx.factoryProduct.findUnique({
    where: { factoryId_productId: { factoryId, productId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient factory product stock for product ${productId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.factoryProduct.update({
    where: { factoryId_productId: { factoryId, productId } },
    data: updateData
  });
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
}

async function decrementStoreMaterialStock(tx, storeId, materialId, quantity, batchInfo = null) {
  const existing = await tx.storeMaterial.findUnique({
    where: { store_id_material_id: { store_id: storeId, material_id: materialId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient store material stock for material ${materialId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.storeMaterial.update({
    where: { store_id_material_id: { store_id: storeId, material_id: materialId } },
    data: updateData
  });
  await tx.material.update({ where: { id: materialId }, data: { current_stock: { decrement: quantity } } });
}

async function decrementShopMaterialStock(tx, shopId, materialId, quantity, batchInfo = null) {
  const existing = await tx.shopMaterial.findUnique({
    where: { shop_id_material_id: { shop_id: shopId, material_id: materialId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient shop material stock for material ${materialId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.shopMaterial.update({
    where: { shop_id_material_id: { shop_id: shopId, material_id: materialId } },
    data: updateData
  });
  await tx.material.update({ where: { id: materialId }, data: { current_stock: { decrement: quantity } } });
}

async function decrementFactoryMaterialStock(tx, factoryId, materialId, quantity, batchInfo = null) {
  const existing = await tx.factoryMaterial.findUnique({
    where: { factoryId_materialId: { factoryId, materialId } }
  });
  if (!existing || (parseFloat(existing.stock) || 0) < quantity) {
    throw new Error(`Insufficient factory material stock for material ${materialId}`);
  }
  const updateData = { stock: { decrement: quantity } };
  if (batchInfo?.batchNumber) {
    updateData.batchDetails = decrementBatch(existing.batchDetails, batchInfo, quantity);
  }
  await tx.factoryMaterial.update({
    where: { factoryId_materialId: { factoryId, materialId } },
    data: updateData
  });
  await tx.material.update({ where: { id: materialId }, data: { current_stock: { decrement: quantity } } });
}

async function decrementProductStock(tx, destinationType, destinationId, productId, quantity, batchInfo = null) {
  if (quantity <= 0) return;
  if (destinationType === "store") return decrementStoreProductStock(tx, destinationId, productId, quantity, batchInfo);
  if (destinationType === "shop") return decrementShopProductStock(tx, destinationId, productId, quantity, batchInfo);
  if (destinationType === "factory") return decrementFactoryProductStock(tx, destinationId, productId, quantity, batchInfo);
  throw new Error("Invalid destination type for product stock decrement");
}

async function decrementMaterialStock(tx, destinationType, destinationId, materialId, quantity, batchInfo = null) {
  if (quantity <= 0) return;
  if (destinationType === "store") return decrementStoreMaterialStock(tx, destinationId, materialId, quantity, batchInfo);
  if (destinationType === "shop") return decrementShopMaterialStock(tx, destinationId, materialId, quantity, batchInfo);
  if (destinationType === "factory") return decrementFactoryMaterialStock(tx, destinationId, materialId, quantity, batchInfo);
  throw new Error("Invalid destination type for material stock decrement");
}

const normalizePurchaseItemsInput = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    itemType: item.itemType,
    productId: item.itemType === "product" ? parseInt(item.productId || item.itemId) : null,
    materialId: item.itemType === "material" ? parseInt(item.materialId || item.itemId) : null,
    selectedName: item.selectedName ? String(item.selectedName).trim() : null,
    selectedUnit: item.selectedUnit ? String(item.selectedUnit).trim() : null,
    selectedQuantity: item.selectedQuantity !== undefined && item.selectedQuantity !== null ? parseFloat(item.selectedQuantity) : null,
    batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
    expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
    manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
    batchNotes: item.batchNotes || null,
    quantity: parseFloat(item.quantity || 0),
    unitPrice: parseFloat(item.unitPrice || 0),
    receivedQuantity: item.receivedQuantity !== undefined && item.receivedQuantity !== null
      ? parseFloat(item.receivedQuantity)
      : parseFloat(item.quantity || 0),
  }));

// GET all purchases with filtering, sorting, and calculated due/status
router.get('/', async (req, res) => {
  let usePagination = false;
  let pageNumber = 1;
  let limitNumber = 10;
  try {
    const {
      page,
      limit,
      search = '',
      supplierId = '',
      destinationType = '',
      destinationId = '',
      shippingStatus = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    usePagination = Number.isFinite(parsedPage) || Number.isFinite(parsedLimit);
    pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    limitNumber = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
    const skip = (pageNumber - 1) * limitNumber;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const locationFilter = buildLocationOrFilter(scope);
    const queryWhere = {};

    if (search && String(search).trim()) {
      const q = String(search).trim();
      queryWhere.OR = [
        { reference: { contains: q } },
        { supplier: { name: { contains: q } } },
      ];
    }
    if (supplierId && Number.isFinite(parseInt(supplierId, 10))) {
      queryWhere.supplierId = parseInt(supplierId, 10);
    }
    if (destinationType && ['store', 'shop', 'factory'].includes(String(destinationType))) {
      queryWhere.destinationType = String(destinationType);
    }
    if (destinationId && Number.isFinite(parseInt(destinationId, 10))) {
      queryWhere.destinationId = parseInt(destinationId, 10);
    }
    if (shippingStatus && String(shippingStatus).trim()) {
      queryWhere.shippingStatus = String(shippingStatus).trim();
    }
    const startDate = dateFrom ? new Date(dateFrom) : null;
    const endDate = dateTo ? new Date(dateTo) : null;
    if ((startDate && !Number.isNaN(startDate.getTime())) || (endDate && !Number.isNaN(endDate.getTime()))) {
      queryWhere.createdAt = {};
      if (startDate && !Number.isNaN(startDate.getTime())) queryWhere.createdAt.gte = startDate;
      if (endDate && !Number.isNaN(endDate.getTime())) queryWhere.createdAt.lte = endDate;
    }

    const andClauses = [];
    if (locationFilter) andClauses.push(locationFilter);
    if (Object.keys(queryWhere).length) andClauses.push(queryWhere);
    const where = andClauses.length ? { AND: andClauses } : undefined;

    const allowedSort = new Set(['createdAt', 'grandTotal', 'paidAmount', 'reference', 'shippingStatus']);
    const finalSortBy = allowedSort.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const finalSortDirection = String(sortDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const totalCount = usePagination ? await prisma.purchase.count({ where }) : null;
    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { [finalSortBy]: finalSortDirection },
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
            createdBy: { select: { id: true, name: true, email: true } }
          }
        },
        account: true
      }
    });

    const purchasesWithDestinations = await Promise.all(
      purchases.map(async (purchase) => {
        let destination = null;
        if (purchase.destinationType && purchase.destinationId) {
          if (purchase.destinationType === 'store') {
            destination = await prisma.store.findUnique({
              where: { id: purchase.destinationId },
              select: { id: true, name: true, address: true }
            });
          } else if (purchase.destinationType === 'shop') {
            destination = await prisma.shop.findUnique({
              where: { id: purchase.destinationId },
              select: { id: true, name: true, address: true }
            });
          } else if (purchase.destinationType === 'factory') {
            destination = await prisma.factory.findUnique({
              where: { id: purchase.destinationId },
              select: { id: true, name: true, address: true }
            });
          }
        }

        const { dueAmount, status } = calculatePurchaseStatus(purchase);
        return {
          ...purchase,
          destination: destination ? { type: purchase.destinationType, ...destination } : null,
          dueAmount,
          status
        };
      })
    );

    if (usePagination) {
      return res.json({
        data: purchasesWithDestinations,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNumber)
        }
      });
    }

    res.json(purchasesWithDestinations);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    if (error.status === 403) {
      if (usePagination) {
        return res.json({
          data: [],
          pagination: { page: pageNumber, limit: limitNumber, totalCount: 0, totalPages: 0 }
        });
      }
      return res.json([]);
    }
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const {
      search = '',
      supplierId = '',
      destinationType = '',
      destinationId = '',
      shippingStatus = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    const locationFilter = buildLocationOrFilter(scope);
    const queryWhere = {};

    if (search && String(search).trim()) {
      const q = String(search).trim();
      queryWhere.OR = [
        { reference: { contains: q } },
        { supplier: { name: { contains: q } } },
      ];
    }
    if (supplierId && Number.isFinite(parseInt(supplierId, 10))) {
      queryWhere.supplierId = parseInt(supplierId, 10);
    }
    if (destinationType && ['store', 'shop', 'factory'].includes(String(destinationType))) {
      queryWhere.destinationType = String(destinationType);
    }
    if (destinationId && Number.isFinite(parseInt(destinationId, 10))) {
      queryWhere.destinationId = parseInt(destinationId, 10);
    }
    if (shippingStatus && String(shippingStatus).trim()) {
      queryWhere.shippingStatus = String(shippingStatus).trim();
    }
    const startDate = dateFrom ? new Date(dateFrom) : null;
    const endDate = dateTo ? new Date(dateTo) : null;
    if ((startDate && !Number.isNaN(startDate.getTime())) || (endDate && !Number.isNaN(endDate.getTime()))) {
      queryWhere.createdAt = {};
      if (startDate && !Number.isNaN(startDate.getTime())) queryWhere.createdAt.gte = startDate;
      if (endDate && !Number.isNaN(endDate.getTime())) queryWhere.createdAt.lte = endDate;
    }

    const andClauses = [];
    if (locationFilter) andClauses.push(locationFilter);
    if (Object.keys(queryWhere).length) andClauses.push(queryWhere);
    const where = andClauses.length ? { AND: andClauses } : undefined;

    const [aggregate, grouped] = await Promise.all([
      prisma.purchase.aggregate({
        where,
        _count: { id: true },
        _sum: { grandTotal: true, paidAmount: true },
      }),
      prisma.purchase.groupBy({
        by: ['shippingStatus'],
        where,
        _count: { id: true },
      }),
    ]);

    const byShippingStatus = grouped.reduce((acc, row) => {
      acc[row.shippingStatus || 'unknown'] = Number(row._count?.id || 0);
      return acc;
    }, {});

    const totalAmount = Number(aggregate?._sum?.grandTotal || 0);
    const totalPaid = Number(aggregate?._sum?.paidAmount || 0);
    const totalDue = Math.max(0, totalAmount - totalPaid);

    res.json({
      totalCount: Number(aggregate?._count?.id || 0),
      totalAmount,
      totalPaid,
      totalDue,
      byShippingStatus,
    });
  } catch (error) {
    if (error.status === 403) {
      return res.json({
        totalCount: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        byShippingStatus: {},
      });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch purchase overview' });
  }
});

router.get('/returns', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const requestedType = String(req.query.returnType || '').trim().toLowerCase();
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const usePagination = Number.isFinite(page) || Number.isFinite(limit);
    const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;
    const limitNumber = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const skip = (pageNumber - 1) * limitNumber;
    const where = {};
    if (requestedType === 'purchase_return' || requestedType === 'damage_return') {
      where.returnType = requestedType;
    }
    if (!scope.isAdmin) {
      const storeIds = Array.from(scope.stores || []);
      const shopIds = Array.from(scope.shops || []);
      const factoryIds = Array.from(scope.factories || []);
      const scopedOr = [];
      if (storeIds.length) scopedOr.push({ sourceType: 'store', sourceId: { in: storeIds } });
      if (shopIds.length) scopedOr.push({ sourceType: 'shop', sourceId: { in: shopIds } });
      if (factoryIds.length) scopedOr.push({ sourceType: 'factory', sourceId: { in: factoryIds } });
      if (!scopedOr.length) {
        if (usePagination) {
          return res.json({
            data: [],
            pagination: { page: pageNumber, limit: limitNumber, totalCount: 0, totalPages: 0 },
          });
        }
        return res.json({ returns: [] });
      }
      where.OR = scopedOr;
    }

    const totalCount = await prisma.purchaseReturn.count({ where });
    const rows = await prisma.purchaseReturn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: usePagination ? skip : undefined,
      take: usePagination ? limitNumber : undefined,
      include: {
        supplier: { select: { id: true, name: true, mobile: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
            material: { select: { id: true, name: true } },
          },
        },
        compensationShipments: {
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true } },
                material: { select: { id: true, name: true } },
              },
            },
          },
        },
        compensationPayments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const mapped = rows.map((row) => {
      const paymentsTotal = (row.compensationPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      return {
        ...row,
        paymentsTotal,
        shipmentsCount: row.compensationShipments?.length || 0,
      };
    });

    if (usePagination) {
      return res.json({
        data: mapped,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalCount,
          totalPages: Math.ceil(totalCount / limitNumber),
        },
      });
    }

    res.json({ returns: mapped });
  } catch (error) {
    if (error.status === 403) {
      if (req.query.page || req.query.limit) {
        return res.json({
          data: [],
          pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0 },
        });
      }
      return res.json({ returns: [] });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch returns' });
  }
});

router.post('/returns', async (req, res) => createStandalonePurchaseOrDamageReturn(req, res, 'purchase_return'));
router.post('/damage-returns', async (req, res) => createStandalonePurchaseOrDamageReturn(req, res, 'damage_return'));

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

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchase.destinationType && purchase.destinationId) {
      ensureIdScope(scope, purchase.destinationType, purchase.destinationId);
    } else {
      ensureHasAnyScope(scope);
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
    if (error.status === 403) {
      return res.json(null);
    }
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// PUT update purchase with stock/payment reconciliation
router.put('/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id, 10);
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        purchaseItems: true,
        purchaseShipments: { include: { items: true } }
      }
    });
    if (!existingPurchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (existingPurchase.destinationType && existingPurchase.destinationId) {
      ensureIdScope(scope, existingPurchase.destinationType, existingPurchase.destinationId);
    } else {
      ensureHasAnyScope(scope);
    }

    const {
      supplierId,
      destinationType,
      destinationId,
      shippingCost,
      discount,
      tax,
      items,
      additionalPayment = 0,
      paymentMethod = 'cash',
      bankAccountId,
      cashRegisterId,
      accountId,
      note
    } = req.body;

    const nextDestinationType = destinationType || existingPurchase.destinationType;
    const nextDestinationId = destinationId ? parseInt(destinationId, 10) : existingPurchase.destinationId;
    if (!nextDestinationType || !nextDestinationId) {
      return res.status(400).json({ error: 'Destination is required' });
    }
    ensureIdScope(scope, nextDestinationType, nextDestinationId);

    const normalizedItems = normalizePurchaseItemsInput(items);
    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    for (const item of normalizedItems) {
      if (!item.itemType || !['product', 'material'].includes(item.itemType)) {
        return res.status(400).json({ error: 'Each item must have valid itemType' });
      }
      if (item.itemType === 'product' && !item.productId) {
        return res.status(400).json({ error: 'Product item must have productId' });
      }
      if (item.itemType === 'material' && !item.materialId) {
        return res.status(400).json({ error: 'Material item must have materialId' });
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: 'Item quantity must be > 0' });
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
        return res.status(400).json({ error: 'Item unitPrice must be > 0' });
      }
      if (!Number.isFinite(item.receivedQuantity) || item.receivedQuantity < 0 || item.receivedQuantity > item.quantity) {
        return res.status(400).json({ error: 'receivedQuantity must be between 0 and quantity' });
      }
    }

    const shippingCostValue = shippingCost !== undefined ? parseFloat(shippingCost) || 0 : parseFloat(existingPurchase.shippingCost) || 0;
    const discountValue = discount !== undefined ? parseFloat(discount) || 0 : parseFloat(existingPurchase.discount) || 0;
    const taxValue = tax !== undefined ? parseFloat(tax) || 0 : parseFloat(existingPurchase.tax) || 0;

    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = (discountValue / 100) * subtotal;
    const amountAfterDiscount = subtotal - discountAmount;
    const taxAmount = (taxValue / 100) * amountAfterDiscount;
    const nextGrandTotal = amountAfterDiscount + taxAmount + shippingCostValue;

    const paymentDelta = parseFloat(additionalPayment) || 0;
    if (paymentDelta < 0) {
      return res.status(400).json({ error: 'additionalPayment cannot be negative' });
    }

    const oldPaid = parseFloat(existingPurchase.paidAmount) || 0;
    const nextPaid = oldPaid + paymentDelta;
    if (nextPaid > nextGrandTotal + Number.EPSILON) {
      return res.status(400).json({ error: 'Total paid cannot exceed grand total after edit' });
    }

    const receivedByOldItemId = {};
    for (const shipment of existingPurchase.purchaseShipments || []) {
      for (const si of shipment.items || []) {
        if (!si.purchaseItemId) continue;
        receivedByOldItemId[si.purchaseItemId] = (receivedByOldItemId[si.purchaseItemId] || 0) + (parseFloat(si.received_quantity) || 0);
      }
    }

    const entityAccount = await prisma.entityAccount.findFirst({
      where: {
        entityType: nextDestinationType,
        entityId: nextDestinationId,
        isPrimary: true
      },
      include: { account: true }
    });
    if (!entityAccount) {
      return res.status(400).json({ error: 'No primary account found for destination' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: reverse previously received stock
      for (const oldItem of existingPurchase.purchaseItems) {
        const receivedQty = parseFloat(receivedByOldItemId[oldItem.id] || 0);
        if (receivedQty <= 0) continue;
        const batchInfo = {
          batchNumber: oldItem.batchNumber,
          expiryDate: parseDateOnly(oldItem.expiryDate),
        };
        if (oldItem.itemType === 'product') {
          await decrementProductStock(
            tx,
            existingPurchase.destinationType,
            existingPurchase.destinationId,
            oldItem.productId,
            receivedQty,
            batchInfo
          );
        } else {
          await decrementMaterialStock(
            tx,
            existingPurchase.destinationType,
            existingPurchase.destinationId,
            oldItem.materialId,
            receivedQty,
            batchInfo
          );
        }
      }

      await tx.purchaseShipmentItem.deleteMany({
        where: { shipment: { purchaseId } }
      });
      await tx.purchaseShipment.deleteMany({ where: { purchaseId } });
      await tx.purchaseItem.deleteMany({ where: { purchaseId } });

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          supplierId: supplierId ? parseInt(supplierId, 10) : existingPurchase.supplierId,
          destinationType: nextDestinationType,
          destinationId: nextDestinationId,
          shippingCost: shippingCostValue,
          discount: discountValue,
          tax: taxValue,
          grandTotal: nextGrandTotal,
          paidAmount: nextPaid,
          accountId: accountId ? parseInt(accountId, 10) : existingPurchase.accountId,
        }
      });

      const createdItems = [];
      for (const item of normalizedItems) {
        const created = await tx.purchaseItem.create({
          data: {
            purchaseId,
            itemType: item.itemType,
            productId: item.productId,
            materialId: item.materialId,
            selectedName: item.selectedName,
            selectedUnit: item.selectedUnit,
            selectedQuantity: item.selectedQuantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            manufactureDate: item.manufactureDate,
            batchNotes: item.batchNotes,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          }
        });
        createdItems.push({ created, receivedQty: item.receivedQuantity });
      }

      const shipmentStatus = calculateShippingStatusFromReceived(
        createdItems.map((entry) => ({
          quantity: entry.created.quantity,
          receivedQuantity: entry.receivedQty
        }))
      );

      const shipment = await tx.purchaseShipment.create({
        data: {
          purchaseId,
          reference: `SHIP-EDIT-${Date.now()}`,
          status: shipmentStatus,
          receivedAt: shipmentStatus === 'received' ? new Date() : null,
          note: 'Auto shipment recreated from purchase edit'
        }
      });

      for (const entry of createdItems) {
        const { created, receivedQty } = entry;
        if (receivedQty > 0) {
          await tx.purchaseShipmentItem.create({
            data: {
              shipmentId: shipment.id,
              purchaseItemId: created.id,
              itemType: created.itemType,
              materialId: created.materialId,
              productId: created.productId,
              quantity: receivedQty,
              received_quantity: receivedQty
            }
          });
          const batchInfo = {
            batchNumber: created.batchNumber,
            expiryDate: parseDateOnly(created.expiryDate),
            quantity: receivedQty,
            unitCost: created.unitPrice
          };
          if (created.itemType === 'product') {
            await updateProductStock(tx, nextDestinationType, nextDestinationId, created.productId, receivedQty, created.unitPrice, batchInfo);
          } else {
            await updateMaterialStock(tx, nextDestinationType, nextDestinationId, created.materialId, receivedQty, created.unitPrice, batchInfo);
          }
        }
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: { shippingStatus: shipmentStatus }
      });

      if (paymentDelta > 0) {
        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { decrement: paymentDelta } }
        });

        let bankRecord = null;
        if (["bank", "card", "bank_transfer"].includes(String(paymentMethod || "cash").toLowerCase()) && bankAccountId) {
          bankRecord = await tx.bankAccount.update({
            where: { id: parseInt(bankAccountId, 10) },
            data: { current_balance: { decrement: paymentDelta } }
          });
        }

        await createTransaction(tx, {
          reference: generateTransactionReference(),
          createdById: req.user?.userId || 1,
          cashRegisterId: cashRegisterId ? parseInt(cashRegisterId, 10) : null,
          bankAccountId: bankRecord ? bankRecord.id : null,
          accountId: entityAccount.accountId,
          purchaseId,
          purpose: 'Purchase Edit Additional Payment',
          added_to_account: false,
          amount: paymentDelta,
          payment_method: paymentMethod || 'cash',
          current_account_balance: updatedAccount.balance,
          note: note || `Additional payment on purchase edit (${updatedPurchase.reference || updatedPurchase.id})`
        });
      }

      if (nextGrandTotal < oldPaid) {
        await createNotification(tx, {
          title: `Purchase ${updatedPurchase.reference || updatedPurchase.id} overpaid after edit`,
          description: `Grand total reduced to ${nextGrandTotal.toFixed(2)} while already paid is ${oldPaid.toFixed(2)}. Admin review needed.`,
          forRole: "admin",
          link: "/purchase/all"
        });
      }

      await createNotification(tx, {
        title: `Purchase updated (${updatedPurchase.reference || updatedPurchase.id})`,
        description: `Purchase ${updatedPurchase.reference || updatedPurchase.id} was edited.`,
        forRole: "admin",
        link: "/purchase/all"
      });

      return tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          purchaseItems: { include: { material: true, product: true } },
          supplier: true,
          transactions: true
        }
      });
    });

    const { dueAmount, status } = calculatePurchaseStatus(result);
    res.json({
      message: 'Purchase updated successfully',
      purchase: { ...result, dueAmount, status }
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(400).json({ error: error.message || 'Failed to update purchase' });
  }
});

// POST add shipment to purchase
router.post('/:id/shipments', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const { items, note } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shipment items are required' });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        purchaseItems: true,
        purchaseShipments: {
          include: { items: true }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const receivedByItemId = {};
    purchase.purchaseShipments.forEach((shipment) => {
      shipment.items.forEach((si) => {
        if (!si.purchaseItemId) return;
        receivedByItemId[si.purchaseItemId] = (receivedByItemId[si.purchaseItemId] || 0) + (parseFloat(si.received_quantity) || 0);
      });
    });

    const shipmentItems = [];
    for (const item of items) {
      const purchaseItemId = parseInt(item.purchaseItemId);
      const receivedQty = parseFloat(item.receivedQuantity);
      if (!purchaseItemId || isNaN(purchaseItemId)) {
        return res.status(400).json({ error: 'purchaseItemId is required for shipment items' });
      }
      if (isNaN(receivedQty) || receivedQty <= 0) {
        continue;
      }

      const purchaseItem = purchase.purchaseItems.find((pi) => pi.id === purchaseItemId);
      if (!purchaseItem) {
        return res.status(400).json({ error: 'Invalid purchaseItemId' });
      }

      const receivedSoFar = receivedByItemId[purchaseItemId] || 0;
      const remaining = (parseFloat(purchaseItem.quantity) || 0) - receivedSoFar;
      if (receivedQty > remaining) {
        return res.status(400).json({ error: 'Received quantity cannot exceed remaining quantity' });
      }

      shipmentItems.push({
        purchaseItem,
        receivedQty
      });
    }

    if (shipmentItems.length === 0) {
      return res.status(400).json({ error: 'No valid shipment items to add' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.purchaseShipment.create({
        data: {
          purchaseId: purchase.id,
          reference: `SHIP-${Date.now()}`,
          status: 'received',
          note: note || null,
          receivedAt: new Date()
        }
      });

      for (const entry of shipmentItems) {
        const { purchaseItem, receivedQty } = entry;
        await tx.purchaseShipmentItem.create({
          data: {
            shipmentId: shipment.id,
            purchaseItemId: purchaseItem.id,
            itemType: purchaseItem.itemType,
            materialId: purchaseItem.materialId,
            productId: purchaseItem.productId,
            quantity: receivedQty,
            received_quantity: receivedQty
          }
        });

        if (purchaseItem.itemType === 'product') {
          await updateProductStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            purchaseItem.productId,
            receivedQty,
            purchaseItem.unitPrice,
            {
              batchNumber: purchaseItem.batchNumber,
              expiryDate: parseDateOnly(purchaseItem.expiryDate),
              quantity: receivedQty,
              unitCost: purchaseItem.unitPrice,
            }
          );
        } else {
          await updateMaterialStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            purchaseItem.materialId,
            receivedQty,
            purchaseItem.unitPrice,
            {
              batchNumber: purchaseItem.batchNumber,
              expiryDate: parseDateOnly(purchaseItem.expiryDate),
              quantity: receivedQty,
              unitCost: purchaseItem.unitPrice,
            }
          );
        }

        receivedByItemId[purchaseItem.id] = (receivedByItemId[purchaseItem.id] || 0) + receivedQty;
      }

      const newShippingStatus = calculateShippingStatusFromTotals(purchase.purchaseItems, receivedByItemId);
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { shippingStatus: newShippingStatus }
      });

      await createNotification(tx, {
        title: `Purchase shipment received (${purchase.reference || purchase.id})`,
        description: `A shipment was added to purchase ${purchase.reference || purchase.id}.`,
        forRole: "admin",
        link: "/purchase/all"
      });

      return { shipment, shippingStatus: newShippingStatus };
    });

    res.json({
      success: true,
      shipment: result.shipment,
      shippingStatus: result.shippingStatus
    });
  } catch (error) {
    console.error('Error adding shipment:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(500).json({ error: error.message || 'Failed to add shipment' });
  }
});

// GET shipments for a purchase
router.get('/:id/shipments', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { id: true, destinationType: true, destinationId: true }
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchase.destinationType && purchase.destinationId) {
      ensureIdScope(scope, purchase.destinationType, purchase.destinationId);
    } else {
      ensureHasAnyScope(scope);
    }

    const shipments = await prisma.purchaseShipment.findMany({
      where: { purchaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            material: true,
            product: true,
            purchaseItem: true
          }
        }
      }
    });

    res.json({ shipments });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    if (error.status === 403) {
      return res.json({ shipments: [] });
    }
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// POST add payment to purchase
  router.post('/:id/payments', async (req, res) => {
    try {
    const purchaseId = parseInt(req.params.id);
    const actingUserId = parseInt(req.user?.userId, 10);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }
    if (!actingUserId) {
      return res.status(401).json({ error: 'Unauthorized user context missing' });
    }

    const { 
      amount, 
      payment_method, 
      accountId, 
      bankAccountId,
      cashRegisterId,
      note,
      purpose = 'Purchase Payment'
    } = req.body;

    // Validate required fields
    if (!amount || !payment_method || !accountId) {
      return res.status(400).json({ 
        error: 'Amount, payment method, and account ID are required' 
      });
    }

    const paymentAmount = parseFloat(amount);
    const parsedAccountId = parseInt(accountId);
    
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
    const account = await prisma.accounts.findFirst({
      where: { id: parsedAccountId, deleted_at: false }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const actor = await prisma.user.findFirst({
      where: { id: actingUserId, deleted_at: false },
      select: { id: true }
    });
    if (!actor) {
      return res.status(401).json({ error: 'Authenticated user not found' });
    }

    // Calculate due amount
    const { dueAmount } = calculatePurchaseStatus(purchase);
    
    // Check if payment exceeds due amount
    if ( (paymentAmount.toFixed(2) - dueAmount.toFixed(2)) > 0.001 ) {
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
        where: { id: parsedAccountId },
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
        createdById: actingUserId,
        cashRegisterId: cashRegisterId ? parseInt(cashRegisterId) : null,
        bankAccountId: bankAccountRecord ? bankAccountRecord.id : (bankAccountId ? parseInt(bankAccountId) : null),
        accountId: parsedAccountId,
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

    await createNotification(prisma, {
      title: `Purchase payment (${updatedPurchase.reference || updatedPurchase.id})`,
      description: `Payment of ${paymentAmount} was added to purchase ${updatedPurchase.reference || updatedPurchase.id}.`,
      forRole: "admin",
      link: "/purchase/all"
    });

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
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
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

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchase.destinationType && purchase.destinationId) {
      ensureIdScope(scope, purchase.destinationType, purchase.destinationId);
    } else {
      ensureHasAnyScope(scope);
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
    if (error.status === 403) {
      return res.json({
        purchase: null,
        payments: [],
        summary: { totalAmount: 0, totalPaid: 0, dueAmount: 0, status: "pending" }
      });
    }
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

const validateCompensationDestination = async (tx, destinationType, destinationId) => {
  if (!destinationType || !destinationId) {
    throw new Error('Compensation destination is required');
  }
  if (!['store', 'shop', 'factory'].includes(destinationType)) {
    throw new Error('Invalid compensation destination type');
  }
  await validateDestinationExists(destinationType, parseInt(destinationId, 10));
};

async function applyCompensationItemsShipment(tx, payload) {
  const {
    purchaseReturnId,
    destinationType,
    destinationId,
    shipmentNote,
    items
  } = payload;

  await validateCompensationDestination(tx, destinationType, destinationId);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Compensation items are required');
  }

  const shipment = await tx.purchaseReturnCompensationShipment.create({
    data: {
      purchaseReturnId,
      reference: `PR-COMP-${Date.now()}`,
      destinationType,
      destinationId: parseInt(destinationId, 10),
      note: shipmentNote || null,
      receivedAt: new Date(),
    }
  });

  let shipmentValue = 0;
  for (const item of items) {
    const itemType = String(item.itemType || '').toLowerCase();
    const quantity = parseFloat(item.quantity || 0);
    const unitPrice = parseFloat(item.unitPrice || 0);
    if (!['product', 'material'].includes(itemType)) {
      throw new Error('Compensation item type must be product or material');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Compensation item quantity must be > 0');
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Compensation item unitPrice must be > 0');
    }
    const productId = itemType === 'product' ? parseInt(item.productId || item.itemId, 10) : null;
    const materialId = itemType === 'material' ? parseInt(item.materialId || item.itemId, 10) : null;
    if (itemType === 'product' && !productId) throw new Error('Compensation product item needs productId');
    if (itemType === 'material' && !materialId) throw new Error('Compensation material item needs materialId');

    const batchNumber = item.batchNumber ? String(item.batchNumber).trim() : null;
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const manufactureDate = item.manufactureDate ? new Date(item.manufactureDate) : null;
    const batchNotes = item.batchNotes || null;

    await tx.purchaseReturnCompensationItem.create({
      data: {
        shipmentId: shipment.id,
        itemType,
        productId,
        materialId,
        quantity,
        unitPrice,
        batchNumber,
        expiryDate,
        manufactureDate,
        batchNotes,
      }
    });

    const batchInfo = {
      batchNumber,
      expiryDate: parseDateOnly(expiryDate),
      quantity,
      unitCost: unitPrice,
    };
    if (itemType === 'product') {
      await updateProductStock(tx, destinationType, parseInt(destinationId, 10), productId, quantity, unitPrice, batchInfo);
    } else {
      await updateMaterialStock(tx, destinationType, parseInt(destinationId, 10), materialId, quantity, unitPrice, batchInfo);
    }
    shipmentValue += quantity * unitPrice;
  }

  return { shipment, shipmentValue };
}

const normalizePositiveCompensationItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      quantity: parseFloat(item.quantity || 0),
      unitPrice: parseFloat(item.unitPrice || 0),
    }))
    .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice) && item.unitPrice > 0);

const normalizeCompensationShipments = (shipments = []) =>
  (Array.isArray(shipments) ? shipments : [])
    .map((shipment) => ({
      destinationType: shipment.destinationType,
      destinationId: shipment.destinationId,
      shipmentNote: shipment.shipmentNote || null,
      items: normalizePositiveCompensationItems(shipment.items),
    }))
    .filter((shipment) => shipment.items.length > 0);

const calculateCompensationStatus = (totalReturnValue, moneyValue, itemValue) => {
  const total = parseFloat(totalReturnValue || 0);
  const compensated = (parseFloat(moneyValue || 0) || 0) + (parseFloat(itemValue || 0) || 0);
  if (compensated >= total && total > 0) return 'completed';
  if (compensated > 0) return 'partial';
  return 'pending';
};

const getCompensationItemValue = async (tx, purchaseReturnId) => {
  const rows = await tx.purchaseReturnCompensationItem.findMany({
    where: { shipment: { purchaseReturnId } },
    select: { quantity: true, unitPrice: true },
  });
  return rows.reduce(
    (sum, row) => sum + ((parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0)),
    0
  );
};

const normalizeStandaloneReturnItems = (items = [], returnType = "purchase_return") => {
  const normalized = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const itemType = String(raw.itemType || "").toLowerCase();
    if (!["product", "material"].includes(itemType)) {
      throw new Error("Return item type must be product or material");
    }
    const quantity = parseFloat(raw.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Return item quantity must be > 0");
    }
    const unitPrice = parseFloat(raw.unitPrice || 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Return item unitPrice must be > 0");
    }
    const productId = itemType === "product" ? parseInt(raw.productId || raw.itemId, 10) : null;
    const materialId = itemType === "material" ? parseInt(raw.materialId || raw.itemId, 10) : null;
    if (itemType === "product" && !productId) throw new Error("Product return item needs productId");
    if (itemType === "material" && !materialId) throw new Error("Material return item needs materialId");

    normalized.push({
      itemType,
      productId,
      materialId,
      quantity,
      unitPrice,
      isDamaged: returnType === "damage_return" ? true : !!raw.isDamaged,
      batchNumber: raw.batchNumber ? String(raw.batchNumber).trim() : null,
      expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : null,
      manufactureDate: raw.manufactureDate ? new Date(raw.manufactureDate) : null,
      batchNotes: raw.batchNotes || null,
    });
  }
  if (!normalized.length) {
    throw new Error("Return items are required");
  }
  return normalized;
};

const createStandalonePurchaseOrDamageReturn = async (req, res, returnType) => {
  try {
    const {
      supplierId,
      sourceType,
      sourceId,
      items = [],
      compensationType = "money",
      compensationAmount = 0,
      payment_method = "cash",
      bankAccountId,
      cashRegisterId,
      note,
      compensationDestinationType,
      compensationDestinationId,
      compensationShipments = [],
    } = req.body || {};

    if (!sourceType || !["store", "shop", "factory"].includes(String(sourceType).toLowerCase())) {
      return res.status(400).json({ error: "Valid sourceType is required (store/shop/factory)" });
    }
    const parsedSourceId = parseInt(sourceId, 10);
    if (!parsedSourceId) {
      return res.status(400).json({ error: "Valid sourceId is required" });
    }
    const parsedSupplierId = supplierId ? parseInt(supplierId, 10) : null;

    await validateDestinationExists(sourceType, parsedSourceId);
    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, sourceType, parsedSourceId);

    const normalizedReturnItems = normalizeStandaloneReturnItems(items, returnType);
    const totalReturnValue = normalizedReturnItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const normalizedCompensationType = String(compensationType || "money").toLowerCase();
    if (!["money", "items"].includes(normalizedCompensationType)) {
      return res.status(400).json({ error: "compensationType must be money or items" });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const entry of normalizedReturnItems) {
        const batchInfo = {
          batchNumber: entry.batchNumber,
          expiryDate: parseDateOnly(entry.expiryDate),
        };
        if (entry.itemType === "product") {
          await decrementProductStock(
            tx,
            sourceType,
            parsedSourceId,
            entry.productId,
            entry.quantity,
            batchInfo
          );
        } else {
          await decrementMaterialStock(
            tx,
            sourceType,
            parsedSourceId,
            entry.materialId,
            entry.quantity,
            batchInfo
          );
        }
      }

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          reference: `${returnType === "damage_return" ? "DR" : "PR"}-${Date.now()}`,
          purchaseId: null,
          supplierId: parsedSupplierId,
          returnType,
          sourceType,
          sourceId: parsedSourceId,
          totalReturnValue,
          compensationType: normalizedCompensationType,
          compensationAmount:
            normalizedCompensationType === "money"
              ? parseFloat(compensationAmount || 0)
              : null,
          compensationStatus: "pending",
          note: note || null,
          createdById: req.user?.userId || null,
        },
      });

      for (const entry of normalizedReturnItems) {
        await tx.purchaseReturnItem.create({
          data: {
            purchaseReturnId: purchaseReturn.id,
            purchaseItemId: null,
            itemType: entry.itemType,
            productId: entry.productId,
            materialId: entry.materialId,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            totalPrice: entry.quantity * entry.unitPrice,
            isDamaged: entry.isDamaged,
            batchNumber: entry.batchNumber,
            expiryDate: entry.expiryDate,
            manufactureDate: entry.manufactureDate,
            batchNotes: entry.batchNotes,
          },
        });
      }

      let compensatedValue = 0;
      if (normalizedCompensationType === "money") {
        const moneyAmount = parseFloat(compensationAmount || 0);
        if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
          throw new Error("compensationAmount must be > 0 for money compensation");
        }

        const entityAccount = await tx.entityAccount.findFirst({
          where: {
            entityType: sourceType,
            entityId: parsedSourceId,
            isPrimary: true,
          },
        });
        if (!entityAccount) {
          throw new Error("No primary account found for compensation transaction");
        }

        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { increment: moneyAmount } },
        });

        let bankRecord = null;
        if (
          ["bank", "card", "bank_transfer"].includes(
            String(payment_method || "cash").toLowerCase()
          ) &&
          bankAccountId
        ) {
          bankRecord = await tx.bankAccount.update({
            where: { id: parseInt(bankAccountId, 10) },
            data: { current_balance: { increment: moneyAmount } },
          });
        }

        await createTransaction(tx, {
          reference: generateTransactionReference(),
          createdById: req.user?.userId || 1,
          cashRegisterId: cashRegisterId ? parseInt(cashRegisterId, 10) : null,
          bankAccountId: bankRecord ? bankRecord.id : null,
          accountId: entityAccount.accountId,
          purchaseId: null,
          purpose: returnType === "damage_return" ? "Damage Return Compensation" : "Purchase Return Compensation",
          added_to_account: true,
          amount: moneyAmount,
          payment_method: payment_method || "cash",
          current_account_balance: updatedAccount.balance,
          note: note || `Compensation for ${purchaseReturn.reference}`,
        });
        compensatedValue += moneyAmount;
      } else {
        const providedShipments = normalizeCompensationShipments(compensationShipments);
        const fallbackItems = normalizePositiveCompensationItems(req.body.compensationItems || []);
        const shipments = providedShipments.length > 0
          ? providedShipments
          : (fallbackItems.length > 0
              ? [
                  {
                    destinationType: compensationDestinationType,
                    destinationId: compensationDestinationId,
                    items: fallbackItems,
                    shipmentNote: note || null,
                  },
                ]
              : []);

        for (const shipmentPayload of shipments) {
          const applied = await applyCompensationItemsShipment(tx, {
            purchaseReturnId: purchaseReturn.id,
            destinationType: shipmentPayload.destinationType,
            destinationId: shipmentPayload.destinationId,
            shipmentNote: shipmentPayload.shipmentNote,
            items: shipmentPayload.items,
          });
          compensatedValue += applied.shipmentValue;
        }
      }

      const compensationStatus =
        compensatedValue >= totalReturnValue
          ? "completed"
          : compensatedValue > 0
            ? "partial"
            : "pending";
      return tx.purchaseReturn.update({
        where: { id: purchaseReturn.id },
        data: { compensationStatus },
      });
    });

    if (returnType === "damage_return") {
      await createNotification(prisma, {
        title: `Damage return created (${result.reference || result.id})`,
        description: `A standalone damage return ${result.reference || result.id} was created.`,
        forRole: "admin",
        link: "/purchase/all"
      });
    }

    res.status(201).json({
      success: true,
      message: `${returnType === "damage_return" ? "Damage return" : "Purchase return"} created successfully`,
      purchaseReturn: result,
    });
  } catch (error) {
    console.error("Error creating standalone return:", error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.status(400).json({ error: error.message || "Failed to create return" });
  }
};

const createPurchaseOrDamageReturn = async (req, res, returnType) => {
  try {
    const purchaseId = parseInt(req.params.id, 10);
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    const {
      items = [],
      compensationType = 'money',
      compensationAmount = 0,
      payment_method = 'cash',
      bankAccountId,
      cashRegisterId,
      note,
      compensationDestinationType,
      compensationDestinationId,
      compensationShipments = [],
    } = req.body || {};

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        purchaseItems: true,
        purchaseShipments: { include: { items: true } }
      }
    });
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchase.destinationType && purchase.destinationId) {
      ensureIdScope(scope, purchase.destinationType, purchase.destinationId);
    } else {
      ensureHasAnyScope(scope);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Return items are required' });
    }

    const receivedByPurchaseItemId = {};
    for (const shipment of purchase.purchaseShipments || []) {
      for (const si of shipment.items || []) {
        if (!si.purchaseItemId) continue;
        receivedByPurchaseItemId[si.purchaseItemId] = (receivedByPurchaseItemId[si.purchaseItemId] || 0) + (parseFloat(si.received_quantity) || 0);
      }
    }

    const previousReturns = await prisma.purchaseReturnItem.groupBy({
      by: ['purchaseItemId'],
      where: {
        purchaseReturn: { purchaseId },
      },
      _sum: { quantity: true }
    });
    const returnedByPurchaseItemId = {};
    for (const row of previousReturns) {
      if (!row.purchaseItemId) continue;
      returnedByPurchaseItemId[row.purchaseItemId] = parseFloat(row._sum.quantity || 0);
    }

    let totalReturnValue = 0;
    const normalizedReturnItems = [];
    for (const raw of items) {
      const purchaseItemId = parseInt(raw.purchaseItemId, 10);
      const quantity = parseFloat(raw.quantity || 0);
      const unitPrice = parseFloat(raw.unitPrice || 0);
      const isDamaged = !!raw.isDamaged;
      const purchaseItem = purchase.purchaseItems.find((pi) => pi.id === purchaseItemId);
      if (!purchaseItem) {
        return res.status(400).json({ error: `Invalid purchaseItemId ${raw.purchaseItemId}` });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Return quantity must be > 0' });
      }
      if (returnType === 'damage_return' && !isDamaged) {
        return res.status(400).json({ error: 'Damage return items must be marked damaged' });
      }
      const receivedQty = parseFloat(receivedByPurchaseItemId[purchaseItemId] || 0);
      const alreadyReturned = parseFloat(returnedByPurchaseItemId[purchaseItemId] || 0);
      const available = receivedQty - alreadyReturned;
      if (quantity > available + Number.EPSILON) {
        return res.status(400).json({ error: `Return quantity exceeds available for purchase item ${purchaseItemId}` });
      }
      const finalUnitPrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : parseFloat(purchaseItem.unitPrice || 0);
      totalReturnValue += quantity * finalUnitPrice;
      normalizedReturnItems.push({
        purchaseItem,
        quantity,
        unitPrice: finalUnitPrice,
        isDamaged,
      });
    }

    const normalizedCompensationType = String(compensationType || 'money').toLowerCase();
    if (!['money', 'items'].includes(normalizedCompensationType)) {
      return res.status(400).json({ error: 'compensationType must be money or items' });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const entry of normalizedReturnItems) {
        const purchaseItem = entry.purchaseItem;
        const batchInfo = {
          batchNumber: purchaseItem.batchNumber,
          expiryDate: parseDateOnly(purchaseItem.expiryDate),
        };
        if (purchaseItem.itemType === 'product') {
          await decrementProductStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            purchaseItem.productId,
            entry.quantity,
            batchInfo
          );
        } else {
          await decrementMaterialStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            purchaseItem.materialId,
            entry.quantity,
            batchInfo
          );
        }
      }

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          reference: `${returnType === 'damage_return' ? 'DR' : 'PR'}-${Date.now()}`,
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          returnType,
          sourceType: purchase.destinationType,
          sourceId: purchase.destinationId,
          totalReturnValue,
          compensationType: normalizedCompensationType,
          compensationAmount: normalizedCompensationType === 'money' ? parseFloat(compensationAmount || 0) : null,
          compensationStatus: 'pending',
          note: note || null,
          createdById: req.user?.userId || null,
        }
      });

      for (const entry of normalizedReturnItems) {
        const purchaseItem = entry.purchaseItem;
        await tx.purchaseReturnItem.create({
          data: {
            purchaseReturnId: purchaseReturn.id,
            purchaseItemId: purchaseItem.id,
            itemType: purchaseItem.itemType,
            productId: purchaseItem.productId,
            materialId: purchaseItem.materialId,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            totalPrice: entry.quantity * entry.unitPrice,
            isDamaged: entry.isDamaged,
            batchNumber: purchaseItem.batchNumber,
            expiryDate: purchaseItem.expiryDate,
            manufactureDate: purchaseItem.manufactureDate,
            batchNotes: purchaseItem.batchNotes,
          }
        });
      }

      let compensatedValue = 0;
      if (normalizedCompensationType === 'money') {
        const moneyAmount = parseFloat(compensationAmount || 0);
        if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
          throw new Error('compensationAmount must be > 0 for money compensation');
        }

        const entityAccount = await tx.entityAccount.findFirst({
          where: {
            entityType: purchase.destinationType,
            entityId: purchase.destinationId,
            isPrimary: true
          }
        });
        if (!entityAccount) {
          throw new Error('No primary account found for compensation transaction');
        }

        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { increment: moneyAmount } }
        });

        let bankRecord = null;
        if (["bank", "card", "bank_transfer"].includes(String(payment_method || "cash").toLowerCase()) && bankAccountId) {
          bankRecord = await tx.bankAccount.update({
            where: { id: parseInt(bankAccountId, 10) },
            data: { current_balance: { increment: moneyAmount } }
          });
        }

        await createTransaction(tx, {
          reference: generateTransactionReference(),
          createdById: req.user?.userId || 1,
          cashRegisterId: cashRegisterId ? parseInt(cashRegisterId, 10) : null,
          bankAccountId: bankRecord ? bankRecord.id : null,
          accountId: entityAccount.accountId,
          purchaseId: purchase.id,
          purpose: returnType === 'damage_return' ? 'Damage Return Compensation' : 'Purchase Return Compensation',
          added_to_account: true,
          amount: moneyAmount,
          payment_method: payment_method || 'cash',
          current_account_balance: updatedAccount.balance,
          note: note || `Compensation for ${purchaseReturn.reference}`
        });
        compensatedValue += moneyAmount;
      } else {
        const providedShipments = normalizeCompensationShipments(compensationShipments);
        const fallbackItems = normalizePositiveCompensationItems(req.body.compensationItems || []);
        const shipments = providedShipments.length > 0
          ? providedShipments
          : (fallbackItems.length > 0
              ? [{
                  destinationType: compensationDestinationType,
                  destinationId: compensationDestinationId,
                  items: fallbackItems,
                  shipmentNote: note || null,
                }]
              : []);

        for (const shipmentPayload of shipments) {
          const applied = await applyCompensationItemsShipment(tx, {
            purchaseReturnId: purchaseReturn.id,
            destinationType: shipmentPayload.destinationType,
            destinationId: shipmentPayload.destinationId,
            shipmentNote: shipmentPayload.shipmentNote,
            items: shipmentPayload.items,
          });
          compensatedValue += applied.shipmentValue;
        }
      }

      const compensationStatus = compensatedValue >= totalReturnValue ? 'completed' : compensatedValue > 0 ? 'partial' : 'pending';
      const updatedReturn = await tx.purchaseReturn.update({
        where: { id: purchaseReturn.id },
        data: { compensationStatus }
      });

      return updatedReturn;
    });

    if (returnType === "damage_return") {
      await createNotification(prisma, {
        title: `Damage return created (${result.reference || result.id})`,
        description: `A purchase-linked damage return ${result.reference || result.id} was created.`,
        forRole: "admin",
        link: "/purchase/all"
      });
    }

    res.status(201).json({
      success: true,
      message: `${returnType === 'damage_return' ? 'Damage return' : 'Purchase return'} created successfully`,
      purchaseReturn: result
    });
  } catch (error) {
    console.error('Error creating purchase return:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(400).json({ error: error.message || 'Failed to create return' });
  }
};

router.post('/:id/returns', async (req, res) => createPurchaseOrDamageReturn(req, res, 'purchase_return'));
router.post('/:id/damage-returns', async (req, res) => createPurchaseOrDamageReturn(req, res, 'damage_return'));

router.get('/:id/returns', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id, 10);
    if (isNaN(purchaseId)) return res.status(400).json({ error: 'Invalid purchase ID' });

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { id: true, destinationType: true, destinationId: true }
    });
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchase.destinationType && purchase.destinationId) {
      ensureIdScope(scope, purchase.destinationType, purchase.destinationId);
    }

    const rows = await prisma.purchaseReturn.findMany({
      where: { purchaseId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true, material: true } },
        compensationShipments: { include: { items: { include: { product: true, material: true } } } },
      }
    });
    res.json({ returns: rows });
  } catch (error) {
    if (error.status === 403) return res.json({ returns: [] });
    res.status(500).json({ error: error.message || 'Failed to fetch returns' });
  }
});

router.post('/returns/:returnId/compensation-shipments', async (req, res) => {
  try {
    const returnId = parseInt(req.params.returnId, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid return ID' });
    const { destinationType, destinationId, items, shipmentNote } = req.body || {};

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      include: { purchase: true }
    });
    if (!purchaseReturn) return res.status(404).json({ error: 'Return not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchaseReturn.purchase?.destinationType && purchaseReturn.purchase?.destinationId) {
      ensureIdScope(scope, purchaseReturn.purchase.destinationType, purchaseReturn.purchase.destinationId);
    } else if (purchaseReturn.sourceType && purchaseReturn.sourceId) {
      ensureIdScope(scope, purchaseReturn.sourceType, purchaseReturn.sourceId);
    } else {
      ensureHasAnyScope(scope);
    }

    const result = await prisma.$transaction(async (tx) => {
      const applied = await applyCompensationItemsShipment(tx, {
        purchaseReturnId: purchaseReturn.id,
        destinationType,
        destinationId,
        shipmentNote,
        items,
      });

      const compensation = await tx.purchaseReturnCompensationItem.aggregate({
        where: { shipment: { purchaseReturnId: purchaseReturn.id } },
        _sum: { quantity: true }
      });

      const money = parseFloat(purchaseReturn.compensationAmount || 0);
      const itemValue = await getCompensationItemValue(tx, purchaseReturn.id);
      const status = calculateCompensationStatus(purchaseReturn.totalReturnValue, money, itemValue);
      await tx.purchaseReturn.update({
        where: { id: purchaseReturn.id },
        data: { compensationStatus: status }
      });

      return { shipment: applied.shipment, compensatedQuantity: compensation._sum.quantity || 0 };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    res.status(400).json({ error: error.message || 'Failed to add compensation shipment' });
  }
});

router.get('/returns/damage-items', async (req, res) => {
  try {
    const sourceType = String(req.query.sourceType || req.query.type || "").toLowerCase();
    const sourceId = parseInt(req.query.sourceId || req.query.branchId || req.query.id, 10);
    if (!["store", "shop", "factory"].includes(sourceType)) {
      return res.status(400).json({ error: "sourceType must be store, shop, or factory" });
    }
    if (!sourceId) {
      return res.status(400).json({ error: "sourceId is required" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, sourceType, sourceId);

    let productRows = [];
    let materialRows = [];

    if (sourceType === 'store') {
      productRows = await prisma.storeProduct.findMany({
        where: { store_id: sourceId, scrap: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.storeMaterial.findMany({
        where: { store_id: sourceId, scrap: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    } else if (sourceType === 'shop') {
      productRows = await prisma.shopProduct.findMany({
        where: { shop_id: sourceId, scrap: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.shopMaterial.findMany({
        where: { shop_id: sourceId, scrap: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    } else {
      productRows = await prisma.factoryProduct.findMany({
        where: { factoryId: sourceId, scrap: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.factoryMaterial.findMany({
        where: { factoryId: sourceId, scrap: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    }

    const products = productRows.map((row) => ({
      itemType: "product",
      id: row.product_id ?? row.productId,
      name: row.product?.name || "-",
      barcode: row.product?.barcode || null,
      availableQuantity: parseFloat(row.scrap || 0),
      unitPrice: parseFloat(row.product?.cost || row.avg_cost || 0),
      batches: getAvailableBatches(row.batchDetails),
    }));
    const materials = materialRows.map((row) => ({
      itemType: "material",
      id: row.material_id ?? row.materialId,
      name: row.material?.name || "-",
      barcode: row.material?.barcode || null,
      availableQuantity: parseFloat(row.scrap || 0),
      unitPrice: parseFloat(row.material?.unit_cost || row.avg_cost || 0),
      batches: getAvailableBatches(row.batchDetails),
    }));

    res.json({
      sourceType,
      sourceId,
      items: [...products, ...materials],
      products,
      materials,
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to fetch damage items" });
  }
});

router.get('/returns/source-items', async (req, res) => {
  try {
    const sourceType = String(req.query.sourceType || req.query.type || "").toLowerCase();
    const sourceId = parseInt(req.query.sourceId || req.query.branchId || req.query.id, 10);
    if (!["store", "shop", "factory"].includes(sourceType)) {
      return res.status(400).json({ error: "sourceType must be store, shop, or factory" });
    }
    if (!sourceId) {
      return res.status(400).json({ error: "sourceId is required" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, sourceType, sourceId);

    let productRows = [];
    let materialRows = [];

    if (sourceType === 'store') {
      productRows = await prisma.storeProduct.findMany({
        where: { store_id: sourceId, stock: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.storeMaterial.findMany({
        where: { store_id: sourceId, stock: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    } else if (sourceType === 'shop') {
      productRows = await prisma.shopProduct.findMany({
        where: { shop_id: sourceId, stock: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.shopMaterial.findMany({
        where: { shop_id: sourceId, stock: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    } else {
      productRows = await prisma.factoryProduct.findMany({
        where: { factoryId: sourceId, stock: { gt: 0 }, deleted_at: false, product: { deleted_at: false } },
        include: { product: true }
      });
      materialRows = await prisma.factoryMaterial.findMany({
        where: { factoryId: sourceId, stock: { gt: 0 }, deleted_at: false, material: { deleted_at: false } },
        include: { material: true }
      });
    }

    const products = productRows.map((row) => ({
      itemType: "product",
      id: row.product_id ?? row.productId,
      name: row.product?.name || "-",
      barcode: row.product?.barcode || null,
      availableQuantity: parseFloat(row.stock || 0),
      unitPrice: parseFloat(row.product?.cost || row.avg_cost || 0),
      batches: getAvailableBatches(row.batchDetails),
    }));
    const materials = materialRows.map((row) => ({
      itemType: "material",
      id: row.material_id ?? row.materialId,
      name: row.material?.name || "-",
      barcode: row.material?.barcode || null,
      availableQuantity: parseFloat(row.stock || 0),
      unitPrice: parseFloat(row.material?.unit_cost || row.avg_cost || 0),
      batches: getAvailableBatches(row.batchDetails),
    }));

    res.json({
      sourceType,
      sourceId,
      items: [...products, ...materials],
      products,
      materials,
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: "Forbidden" });
    res.status(500).json({ error: error.message || "Failed to fetch source items" });
  }
});

router.get('/returns/:returnId', async (req, res) => {
  try {
    const returnId = parseInt(req.params.returnId, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid return ID' });

    const row = await prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      include: {
        supplier: { select: { id: true, name: true, mobile: true } },
        items: { include: { product: true, material: true } },
        compensationShipments: { include: { items: { include: { product: true, material: true } } } },
        compensationPayments: { orderBy: { createdAt: 'desc' } },
      }
    });
    if (!row) return res.status(404).json({ error: 'Return not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (row.sourceType && row.sourceId) {
      ensureIdScope(scope, row.sourceType, row.sourceId);
    } else {
      ensureHasAnyScope(scope);
    }

    res.json({ purchaseReturn: row });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message || 'Failed to fetch return details' });
  }
});

router.get('/returns/:returnId/payments', async (req, res) => {
  try {
    const returnId = parseInt(req.params.returnId, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid return ID' });

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      select: { id: true, sourceType: true, sourceId: true }
    });
    if (!purchaseReturn) return res.status(404).json({ error: 'Return not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchaseReturn.sourceType && purchaseReturn.sourceId) {
      ensureIdScope(scope, purchaseReturn.sourceType, purchaseReturn.sourceId);
    } else {
      ensureHasAnyScope(scope);
    }

    const payments = await prisma.purchaseReturnPayment.findMany({
      where: { purchaseReturnId: returnId },
      orderBy: { createdAt: 'desc' }
    });
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    res.json({ payments, totalPaid });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message || 'Failed to fetch return payments' });
  }
});

router.post('/returns/:returnId/payments', async (req, res) => {
  try {
    const returnId = parseInt(req.params.returnId, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid return ID' });

    const {
      amount,
      paymentMethod = 'cash',
      note = null,
      bankAccountId,
      cashRegisterId
    } = req.body || {};

    const moneyAmount = parseFloat(amount || 0);
    if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      include: { purchase: true }
    });
    if (!purchaseReturn) return res.status(404).json({ error: 'Return not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchaseReturn.purchase?.destinationType && purchaseReturn.purchase?.destinationId) {
      ensureIdScope(scope, purchaseReturn.purchase.destinationType, purchaseReturn.purchase.destinationId);
    } else if (purchaseReturn.sourceType && purchaseReturn.sourceId) {
      ensureIdScope(scope, purchaseReturn.sourceType, purchaseReturn.sourceId);
    } else {
      ensureHasAnyScope(scope);
    }

    const result = await prisma.$transaction(async (tx) => {
      const sourceType = purchaseReturn.sourceType || purchaseReturn.purchase?.destinationType;
      const sourceId = purchaseReturn.sourceId || purchaseReturn.purchase?.destinationId;
      if (!sourceType || !sourceId) {
        throw new Error('Cannot resolve source location for compensation payment');
      }

      const entityAccount = await tx.entityAccount.findFirst({
        where: { entityType: sourceType, entityId: sourceId, isPrimary: true }
      });
      if (!entityAccount) {
        throw new Error('No primary account found for compensation payment');
      }

      const updatedAccount = await tx.accounts.update({
        where: { id: entityAccount.accountId },
        data: { balance: { increment: moneyAmount } }
      });

      let bankRecord = null;
      if (["bank", "card", "bank_transfer"].includes(String(paymentMethod || "cash").toLowerCase()) && bankAccountId) {
        bankRecord = await tx.bankAccount.update({
          where: { id: parseInt(bankAccountId, 10) },
          data: { current_balance: { increment: moneyAmount } }
        });
      }

      const payment = await tx.purchaseReturnPayment.create({
        data: {
          purchaseReturnId: returnId,
          amount: moneyAmount,
          paymentMethod: paymentMethod || 'cash',
          note: note || null,
          createdById: req.user?.userId || null,
        }
      });

      await createTransaction(tx, {
        reference: generateTransactionReference(),
        createdById: req.user?.userId || 1,
        cashRegisterId: cashRegisterId ? parseInt(cashRegisterId, 10) : null,
        bankAccountId: bankRecord ? bankRecord.id : null,
        accountId: entityAccount.accountId,
        purchaseId: purchaseReturn.purchaseId || null,
        purpose: purchaseReturn.returnType === 'damage_return' ? 'Damage Return Compensation Payment' : 'Purchase Return Compensation Payment',
        added_to_account: true,
        amount: moneyAmount,
        payment_method: paymentMethod || 'cash',
        current_account_balance: updatedAccount.balance,
        note: note || `Compensation payment for ${purchaseReturn.reference}`
      });

      const currentMoney = parseFloat(purchaseReturn.compensationAmount || 0) + moneyAmount;
      const itemValue = await getCompensationItemValue(tx, returnId);
      const status = calculateCompensationStatus(purchaseReturn.totalReturnValue, currentMoney, itemValue);

      const updatedReturn = await tx.purchaseReturn.update({
        where: { id: returnId },
        data: {
          compensationAmount: currentMoney,
          compensationStatus: status,
        }
      });

      return { payment, updatedReturn };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    res.status(400).json({ error: error.message || 'Failed to add payment' });
  }
});

router.delete('/returns/:returnId', async (req, res) => {
  try {
    const returnId = parseInt(req.params.returnId, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid return ID' });

    const purchaseReturn = await prisma.purchaseReturn.findUnique({
      where: { id: returnId },
      include: {
        purchase: true,
        items: true,
        compensationShipments: { include: { items: true } },
        compensationPayments: true,
      },
    });
    if (!purchaseReturn) return res.status(404).json({ error: 'Return not found' });

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (purchaseReturn.purchase?.destinationType && purchaseReturn.purchase?.destinationId) {
      ensureIdScope(scope, purchaseReturn.purchase.destinationType, purchaseReturn.purchase.destinationId);
    } else if (purchaseReturn.sourceType && purchaseReturn.sourceId) {
      ensureIdScope(scope, purchaseReturn.sourceType, purchaseReturn.sourceId);
    } else {
      ensureHasAnyScope(scope);
    }

    await prisma.$transaction(async (tx) => {
      const sourceType = purchaseReturn.sourceType || purchaseReturn.purchase?.destinationType;
      const sourceId = purchaseReturn.sourceId || purchaseReturn.purchase?.destinationId;

      for (const item of purchaseReturn.items || []) {
        const qty = parseFloat(item.quantity || 0);
        if (qty <= 0 || !sourceType || !sourceId) continue;
        const batchInfo = {
          batchNumber: item.batchNumber,
          expiryDate: parseDateOnly(item.expiryDate),
          quantity: qty,
          unitCost: parseFloat(item.unitPrice || 0),
        };
        if (item.itemType === 'product' && item.productId) {
          await updateProductStock(tx, sourceType, sourceId, item.productId, qty, parseFloat(item.unitPrice || 0), batchInfo);
        } else if (item.itemType === 'material' && item.materialId) {
          await updateMaterialStock(tx, sourceType, sourceId, item.materialId, qty, parseFloat(item.unitPrice || 0), batchInfo);
        }
      }

      for (const shipment of purchaseReturn.compensationShipments || []) {
        for (const item of shipment.items || []) {
          const qty = parseFloat(item.quantity || 0);
          if (qty <= 0) continue;
          const batchInfo = {
            batchNumber: item.batchNumber,
            expiryDate: parseDateOnly(item.expiryDate),
          };
          if (item.itemType === 'product' && item.productId) {
            await decrementProductStock(tx, shipment.destinationType, shipment.destinationId, item.productId, qty, batchInfo);
          } else if (item.itemType === 'material' && item.materialId) {
            await decrementMaterialStock(tx, shipment.destinationType, shipment.destinationId, item.materialId, qty, batchInfo);
          }
        }
      }

      await rollbackAndDeleteTransactionsByWhere(tx, {
        purpose: {
          in: [
            'Purchase Return Compensation',
            'Damage Return Compensation',
            'Purchase Return Compensation Payment',
            'Damage Return Compensation Payment',
          ],
        },
        note: { contains: purchaseReturn.reference || '' },
      }, { reverseBalances: true });

      await tx.purchaseReturnCompensationItem.deleteMany({
        where: { shipment: { purchaseReturnId: returnId } },
      });
      await tx.purchaseReturnCompensationShipment.deleteMany({
        where: { purchaseReturnId: returnId },
      });
      await tx.purchaseReturnPayment.deleteMany({
        where: { purchaseReturnId: returnId },
      });
      await tx.purchaseReturnItem.deleteMany({
        where: { purchaseReturnId: returnId },
      });
      await tx.purchaseReturn.delete({
        where: { id: returnId },
      });
    });

    res.json({ success: true, message: 'Return deleted successfully' });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: 'Forbidden' });
    res.status(400).json({ error: error.message || 'Failed to delete return' });
  }
});

// DELETE purchase with stock and payment rollback
router.delete('/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    if (isNaN(purchaseId)) {
      return res.status(400).json({ error: 'Invalid purchase ID' });
    }

    // Check if purchase exists
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        purchaseItems: true,
        purchaseShipments: { include: { items: true } },
        purchaseReturns: {
          include: {
            items: true,
            compensationShipments: { include: { items: true } },
            compensationPayments: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const receivedByPurchaseItemId = {};
    for (const shipment of purchase.purchaseShipments || []) {
      for (const shipmentItem of shipment.items || []) {
        if (!shipmentItem.purchaseItemId) continue;
        receivedByPurchaseItemId[shipmentItem.purchaseItemId] =
          (receivedByPurchaseItemId[shipmentItem.purchaseItemId] || 0) + (parseFloat(shipmentItem.received_quantity) || 0);
      }
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      for (const purchaseReturn of purchase.purchaseReturns || []) {
        const sourceType = purchaseReturn.sourceType || purchase.destinationType;
        const sourceId = purchaseReturn.sourceId || purchase.destinationId;

        for (const item of purchaseReturn.items || []) {
          const qty = parseFloat(item.quantity || 0);
          if (qty <= 0 || !sourceType || !sourceId) continue;
          const batchInfo = {
            batchNumber: item.batchNumber,
            expiryDate: parseDateOnly(item.expiryDate),
            quantity: qty,
            unitCost: parseFloat(item.unitPrice || 0),
          };
          if (item.itemType === 'product' && item.productId) {
            await updateProductStock(tx, sourceType, sourceId, item.productId, qty, parseFloat(item.unitPrice || 0), batchInfo);
          } else if (item.itemType === 'material' && item.materialId) {
            await updateMaterialStock(tx, sourceType, sourceId, item.materialId, qty, parseFloat(item.unitPrice || 0), batchInfo);
          }
        }

        for (const shipment of purchaseReturn.compensationShipments || []) {
          for (const item of shipment.items || []) {
            const qty = parseFloat(item.quantity || 0);
            if (qty <= 0) continue;
            const batchInfo = {
              batchNumber: item.batchNumber,
              expiryDate: parseDateOnly(item.expiryDate),
            };
            if (item.itemType === 'product' && item.productId) {
              await decrementProductStock(tx, shipment.destinationType, shipment.destinationId, item.productId, qty, batchInfo);
            } else if (item.itemType === 'material' && item.materialId) {
              await decrementMaterialStock(tx, shipment.destinationType, shipment.destinationId, item.materialId, qty, batchInfo);
            }
          }
        }

        await rollbackAndDeleteTransactionsByWhere(tx, {
          purpose: {
            in: [
              'Purchase Return Compensation',
              'Damage Return Compensation',
              'Purchase Return Compensation Payment',
              'Damage Return Compensation Payment',
            ],
          },
          note: { contains: purchaseReturn.reference || '' },
        }, { reverseBalances: true });

        await tx.purchaseReturnCompensationItem.deleteMany({
          where: { shipment: { purchaseReturnId: purchaseReturn.id } },
        });
        await tx.purchaseReturnCompensationShipment.deleteMany({
          where: { purchaseReturnId: purchaseReturn.id },
        });
        await tx.purchaseReturnPayment.deleteMany({
          where: { purchaseReturnId: purchaseReturn.id },
        });
        await tx.purchaseReturnItem.deleteMany({
          where: { purchaseReturnId: purchaseReturn.id },
        });
        await tx.purchaseReturn.delete({
          where: { id: purchaseReturn.id },
        });
      }

      for (const item of purchase.purchaseItems || []) {
        const receivedQty = parseFloat(receivedByPurchaseItemId[item.id] || 0);
        if (receivedQty <= 0) continue;
        const batchInfo = {
          batchNumber: item.batchNumber,
          expiryDate: parseDateOnly(item.expiryDate),
        };
        if (item.itemType === 'product') {
          await decrementProductStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            item.productId,
            receivedQty,
            batchInfo
          );
        } else if (item.itemType === 'material') {
          await decrementMaterialStock(
            tx,
            purchase.destinationType,
            purchase.destinationId,
            item.materialId,
            receivedQty,
            batchInfo
          );
        }
      }

      await rollbackAndDeleteTransactionsByWhere(tx, { purchaseId }, { reverseBalances: true });
      await tx.purchaseShipmentItem.deleteMany({ where: { shipment: { purchaseId } } });
      await tx.purchaseShipment.deleteMany({ where: { purchaseId } });
      await tx.purchaseItem.deleteMany({ where: { purchaseId } });
      await tx.purchase.delete({ where: { id: purchaseId } });
    });

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting purchase:', error);
    if (error.status === 403) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to delete purchase' });
  }
});

// GET purchase statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    const locationFilter = buildLocationOrFilter(scope);

    const purchases = await prisma.purchase.findMany({
      where: locationFilter,
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
    if (error.status === 403) {
      return res.json({
        totalPurchases: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        statusCounts: {},
        summary: { paidPercentage: 0, duePercentage: 0 }
      });
    }
    res.status(500).json({ error: 'Failed to fetch purchase statistics' });
  }
});

// Add a new endpoint to get destination options
router.get("/destinations/:type", async (req, res) => {
  try {
    const { type } = req.params;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin) {
      ensureTypeScope(scope, type);
    }

    const scopedIds =
      type === "store" ? Array.from(scope.stores) :
      type === "shop" ? Array.from(scope.shops) :
      type === "factory" ? Array.from(scope.factories) : [];
    const where = !scope.isAdmin ? { id: { in: scopedIds } } : undefined;
    
    let destinations = [];
    
    switch (type) {
      case "store":
        destinations = await prisma.store.findMany({
          where: { ...(where || {}), deleted_at: false },
          select: { id: true, name: true, address: true }
        });
        break;
        
      case "shop":
        destinations = await prisma.shop.findMany({
          where: { ...(where || {}), deleted_at: false },
          select: { id: true, name: true, address: true }
        });
        break;
        
      case "factory":
        destinations = await prisma.factory.findMany({
          where: { ...(where || {}), deleted_at: false },
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
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
