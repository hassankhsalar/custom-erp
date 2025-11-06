const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// ➕ Add Purchase
router.post("/", async (req, res) => {
  try {
    const { supplierId, storeId, grandTotal, reference, items } = req.body;

    // Validate required fields
    if (!supplierId || !storeId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Supplier, store, and at least one item are required" });
    }

    // Validate each item
    for (const item of items) {
      if (!item.materialId || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ error: "Each item must have materialId, quantity, and unitPrice" });
      }
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return res.status(400).json({ error: "Quantity and unitPrice must be positive numbers" });
      }
    }

    // Calculate grand total if not provided
    const calculatedGrandTotal = grandTotal || items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Create purchase transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the purchase
      const purchase = await tx.purchase.create({
        data: {
          reference: reference || `PUR-${Date.now()}`,
          supplierId: parseInt(supplierId),
          storeId: parseInt(storeId),
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

          // 3. Update store material stock
          await updateStoreMaterialStock(tx, parseInt(storeId), parseInt(item.materialId), parseFloat(item.quantity));

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
    res.status(500).json({ error: err.message });
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

// 📋 Get all purchases with items
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

    res.json(purchases);
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

module.exports = router;
