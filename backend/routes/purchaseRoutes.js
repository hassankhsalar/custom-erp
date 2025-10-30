const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// ➕ Add Purchase
router.post("/", async (req, res) => {
  try {
    const { materialId, supplierId, quantity, unitPrice, storeId } = req.body;
    if (!materialId || !supplierId || !quantity || !unitPrice || !storeId)
      return res.status(400).json({ error: "All fields are required" });

    const totalPrice = quantity * unitPrice;

    const purchase = await prisma.purchase.create({
      data: { materialId, supplierId, quantity, unitPrice, totalPrice,
        storeId: storeId || null,  },
      include: { supplier: true, material: true,
        store: true, },
    });

    //  Check if the store already has this material
    const existingStoreMaterial = await prisma.storeMaterial.findUnique({
      where: {
        store_id_material_id: {
          store_id: storeId,
          material_id: materialId,
        },
      },
    });

    if (existingStoreMaterial) {
      //  Update stock for that store
      await prisma.storeMaterial.update({
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
      await prisma.storeMaterial.create({
        data: {
          store_id: storeId,
          material_id: materialId,
          stock: quantity,
        },
      });
    }

    //  Optionally update total material stock
    await prisma.material.update({
      where: { id: materialId },
      data: { current_stock: { increment: quantity } },
    });


    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 Get all purchases
router.get("/", async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        material: { select: { name: true } },
        supplier: { select: { name: true } },
        store: { select: { name: true } },
      },
      orderBy: { id: "desc" },
    });

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
