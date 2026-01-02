const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// ➕ Add Purchase (Updated to support multiple destination types)
router.post("/", async (req, res) => {
  try {
    // Support both old and new format
    const { 
      supplierId, 
      storeId, // For backward compatibility
      destinationType = "store", // New: store, shop, or factory
      destinationId, // New: ID of store, shop, or factory
      grandTotal, 
      reference, 
      items 
    } = req.body;

    // Validate required fields - support both formats
    let actualStoreId = null;
    let actualDestinationType = destinationType;
    let actualDestinationId = null;

    // For backward compatibility: if storeId is provided, use it
    if (storeId && !destinationId) {
      actualStoreId = parseInt(storeId);
      actualDestinationType = "store";
      actualDestinationId = parseInt(storeId);
    } else if (destinationId) {
      // New format: use destinationType and destinationId
      actualDestinationId = parseInt(destinationId);
      actualDestinationType = destinationType || "store";
      
      // If destinationType is "store", set actualStoreId for backward compatibility
      if (actualDestinationType === "store") {
        actualStoreId = actualDestinationId;
      }
    } else {
      return res.status(400).json({ 
        error: "Either storeId or destinationId is required" 
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

    // Validate each item
    for (const item of items) {
      if (!item.materialId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ 
          error: "Each item must have materialId, quantity, and unitPrice" 
        });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ 
          error: "Quantity and unitPrice must be positive numbers" 
        });
      }
    }

    // Calculate grand total if not provided
    const calculatedGrandTotal = grandTotal || 
      items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Create purchase transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the purchase
      const purchase = await tx.purchase.create({
        data: {
          reference: reference || `PUR-${Date.now()}`,
          supplierId: parseInt(supplierId),
          storeId: actualStoreId, // For backward compatibility, null for shop/factory
          grandTotal: calculatedGrandTotal,
        },
      });

      // 2. Create purchase items
      const purchaseItems = await Promise.all(
        items.map(async (item) => {
          const totalPrice = item.quantity * item.unitPrice;
          
          const purchaseItem = await tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              materialId: parseInt(item.materialId),
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              totalPrice: totalPrice,
            },
            include: {
              material: true,
            },
          });

          // 3. Update material stock based on destination type
          switch (actualDestinationType) {
            case "store":
              await updateStoreMaterialStock(
                tx, 
                actualDestinationId, 
                parseInt(item.materialId), 
                parseFloat(item.quantity)
              );
              break;
              
            case "shop":
              await updateShopMaterialStock(
                tx, 
                actualDestinationId, 
                parseInt(item.materialId), 
                parseFloat(item.quantity)
              );
              break;
              
            case "factory":
              await updateFactoryMaterialStock(
                tx, 
                actualDestinationId, 
                parseInt(item.materialId), 
                parseFloat(item.quantity)
              );
              break;
          }

          return purchaseItem;
        })
      );

      return { purchase, purchaseItems };
    });

    res.status(201).json({
      message: "Purchase created successfully",
      purchase: {
        ...result.purchase,
        purchaseItems: result.purchaseItems,
        destinationType: actualDestinationType,
        destinationId: actualDestinationId,
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
        error: "Destination not found" 
      });
    }
    
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Helper function to update store material stock
async function updateStoreMaterialStock(tx, storeId, materialId, quantity) {
  // Check if the store already has this material
  const existingStoreMaterial = await tx.storeMaterial.findUnique({
    where: {
      store_id_material_id: {
        store_id: storeId,
        material_id: materialId,
      },
    },
  });

  if (existingStoreMaterial) {
    // Update stock for that store
    await tx.storeMaterial.update({
      where: {
        store_id_material_id: {
          store_id: storeId,
          material_id: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
      },
    });
  } else {
    // Create a new record if it doesn't exist
    await tx.storeMaterial.create({
      data: {
        store_id: storeId,
        material_id: materialId,
        stock: quantity,
      },
    });
  }

  // Update total material stock
  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Helper function to update shop material stock
async function updateShopMaterialStock(tx, shopId, materialId, quantity) {
  // Check if the shop already has this material
  const existingShopMaterial = await tx.shopMaterial.findUnique({
    where: {
      shop_id_material_id: {
        shop_id: shopId,
        material_id: materialId,
      },
    },
  });

  if (existingShopMaterial) {
    // Update stock for that shop
    await tx.shopMaterial.update({
      where: {
        shop_id_material_id: {
          shop_id: shopId,
          material_id: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
      },
    });
  } else {
    // Create a new record if it doesn't exist
    await tx.shopMaterial.create({
      data: {
        shop_id: shopId,
        material_id: materialId,
        stock: quantity,
      },
    });
  }

  // Update total material stock
  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Helper function to update factory material stock
async function updateFactoryMaterialStock(tx, factoryId, materialId, quantity) {
  // Check if the factory already has this material
  const existingFactoryMaterial = await tx.factoryMaterial.findUnique({
    where: {
      factoryId_materialId: {
        factoryId: factoryId,
        materialId: materialId,
      },
    },
  });

  if (existingFactoryMaterial) {
    // Update stock for that factory
    await tx.factoryMaterial.update({
      where: {
        factoryId_materialId: {
          factoryId: factoryId,
          materialId: materialId,
        },
      },
      data: {
        stock: { increment: quantity },
      },
    });
  } else {
    // Create a new record if it doesn't exist
    await tx.factoryMaterial.create({
      data: {
        factoryId: factoryId,
        materialId: materialId,
        stock: quantity,
      },
    });
  }

  // Update total material stock
  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// 📋 Get all purchases with items (updated to show destination info)
router.get("/", async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: { select: { name: true } },
        store: { select: { name: true } },
        purchaseItems: {
          include: {
            material: { select: { name: true, unit: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    // Add destination information for each purchase
    const purchasesWithDestination = await Promise.all(
      purchases.map(async (purchase) => {
        let destinationInfo = null;
        
        if (purchase.store) {
          // This is a store purchase (backward compatibility)
          destinationInfo = {
            type: "store",
            name: purchase.store.name,
            id: purchase.storeId
          };
        } else {
          // For purchases without storeId (shop/factory), we need to check other tables
          // This would require additional logic if you want to display shop/factory names
          // For now, just mark as unknown
          destinationInfo = {
            type: "unknown",
            name: "Unknown Destination",
            id: null
          };
        }

        return {
          ...purchase,
          destination: destinationInfo
        };
      })
    );

    res.json(purchasesWithDestination);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get single purchase with details
router.get("/:id", async (req, res) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        supplier: true,
        store: true,
        purchaseItems: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
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