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

    // Optional: update material stock
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
