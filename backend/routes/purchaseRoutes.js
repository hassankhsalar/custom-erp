const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// ➕ Add Purchase (Updated with destination tracking)
router.post("/", async (req, res) => {
  try {
    const { 
      supplierId, 
      storeId, // For backward compatibility
      destinationType = "store", 
      destinationId, 
      grandTotal, 
      reference, 
      items 
    } = req.body;

    // Validate required fields
    let actualDestinationType = destinationType;
    let actualDestinationId = null;

    // Handle both old and new formats
    if (storeId && !destinationId) {
      // Old format: storeId provided
      actualDestinationType = "store";
      actualDestinationId = parseInt(storeId);
    } else if (destinationId) {
      // New format: destinationId provided
      actualDestinationId = parseInt(destinationId);
      actualDestinationType = destinationType || "store";
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

    // Validate that the destination exists
    await validateDestinationExists(actualDestinationType, actualDestinationId);

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

    // Set storeId for backward compatibility (only if destination is a store)
    const storeIdForBackward = actualDestinationType === "store" ? actualDestinationId : null;

    // Create purchase transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the purchase with destination tracking
      const purchase = await tx.purchase.create({
        data: {
          reference: reference || `PUR-${Date.now()}`,
          supplierId: parseInt(supplierId),
          storeId: storeIdForBackward, // For backward compatibility
          destinationType: actualDestinationType,
          destinationId: actualDestinationId,
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

// Helper function to update store material stock
async function updateStoreMaterialStock(tx, storeId, materialId, quantity) {
  const existingStoreMaterial = await tx.storeMaterial.findUnique({
    where: {
      store_id_material_id: {
        store_id: storeId,
        material_id: materialId,
      },
    },
  });

  if (existingStoreMaterial) {
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
    await tx.storeMaterial.create({
      data: {
        store_id: storeId,
        material_id: materialId,
        stock: quantity,
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Helper function to update shop material stock
async function updateShopMaterialStock(tx, shopId, materialId, quantity) {
  const existingShopMaterial = await tx.shopMaterial.findUnique({
    where: {
      shop_id_material_id: {
        shop_id: shopId,
        material_id: materialId,
      },
    },
  });

  if (existingShopMaterial) {
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
    await tx.shopMaterial.create({
      data: {
        shop_id: shopId,
        material_id: materialId,
        stock: quantity,
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// Helper function to update factory material stock
async function updateFactoryMaterialStock(tx, factoryId, materialId, quantity) {
  const existingFactoryMaterial = await tx.factoryMaterial.findUnique({
    where: {
      factoryId_materialId: {
        factoryId: factoryId,
        materialId: materialId,
      },
    },
  });

  if (existingFactoryMaterial) {
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
    await tx.factoryMaterial.create({
      data: {
        factoryId: factoryId,
        materialId: materialId,
        stock: quantity,
      },
    });
  }

  await tx.material.update({
    where: { id: materialId },
    data: { current_stock: { increment: quantity } },
  });
}

// 📋 Get all purchases with destination details
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

    // Fetch destination details for each purchase
    const purchasesWithDestinations = await Promise.all(
      purchases.map(async (purchase) => {
        let destination = null;
        
        // If destinationType and destinationId are available, use them
        if (purchase.destinationType && purchase.destinationId) {
          destination = await getDestinationDetails(
            purchase.destinationType, 
            purchase.destinationId
          );
        } 
        // Otherwise fall back to store for backward compatibility
        else if (purchase.storeId && purchase.store) {
          destination = {
            type: "store",
            id: purchase.storeId,
            name: purchase.store.name
          };
        }
        
        return {
          ...purchase,
          destination: destination ? {
            type: purchase.destinationType || "store",
            ...destination
          } : null
        };
      })
    );

    res.json(purchasesWithDestinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get single purchase with full destination details
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

    // Add destination details
    let destination = null;
    if (purchase.destinationType && purchase.destinationId) {
      destination = await getDestinationDetails(
        purchase.destinationType, 
        purchase.destinationId
      );
    } else if (purchase.storeId && purchase.store) {
      destination = {
        type: "store",
        id: purchase.storeId,
        name: purchase.store.name,
        address: purchase.store.address
      };
    }

    res.json({
      ...purchase,
      destination
    });
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