const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { buildScope, ensureIdScope } = require("../utils/associateScope");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require('../utils/transactionHelper');

// 🧾 Create a sale (POS)
router.post("/", async (req, res) => {
  try {
    const { storeId, customer, paymentType, items, discount, bankAccountId } = req.body;

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "store", parseInt(storeId));

    let totalAmount = 0;
    items.forEach(i => {
      totalAmount += i.unitPrice * i.quantity;
    });
    const grandTotal = totalAmount - (discount || 0);

    if (["bank", "card"].includes((paymentType || "cash").toLowerCase()) && !bankAccountId) {
      return res.status(400).json({ message: "Bank account is required for card/bank payments" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const entityAccount = await tx.entityAccount.findFirst({
        where: { entityType: 'store', entityId: parseInt(storeId), isPrimary: true },
        include: { account: true }
      });

      if (!entityAccount) {
        throw new Error("No primary account found for this store");
      }

      let bankRecord = null;
      if (["bank", "card"].includes((paymentType || "cash").toLowerCase()) && bankAccountId) {
        bankRecord = await tx.bankAccount.update({
          where: { id: parseInt(bankAccountId) },
          data: { current_balance: { increment: grandTotal } }
        });
      }

      const sale = await tx.sale.create({
        data: {
          reference: `SALE-${Date.now()}${Math.floor(Math.random() * (10 ** 3))}`,
          storeId,
          customer,
          totalAmount,
          discount: discount || 0,
          grandTotal,
          paymentType,
          bankAccountId: bankRecord ? bankRecord.id : null,
          bankName: bankRecord ? bankRecord.name : null,
          saleItems: {
            create: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.unitPrice * i.quantity
            }))
          }
        },
        include: { saleItems: true }
      });

      for (const i of items) {
        const existingStock = await tx.storeProduct.findUnique({
          where: {
            store_id_product_id: {
              store_id: storeId,
              product_id: i.productId
            }
          }
        });

        if (existingStock) {
          await tx.storeProduct.update({
            where: { store_id_product_id: { store_id: storeId, product_id: i.productId } },
            data: { stock: { decrement: i.quantity } }
          });
        }
      }

      const updatedAccount = await tx.accounts.update({
        where: { id: entityAccount.accountId },
        data: { balance: { increment: grandTotal } }
      });

      const createdById = req.user?.userId || 1;
      await createTransaction(tx, {
        reference: `TRX-${Date.now()}`,
        createdById,
        accountId: entityAccount.accountId,
        bankAccountId: bankRecord ? bankRecord.id : null,
        saleId: sale.id,
        purpose: "Sale Payment",
        added_to_account: true,
        amount: grandTotal,
        payment_method: paymentType || "cash",
        current_account_balance: updatedAccount.balance,
        note: `Payment for sale ${sale.reference}`
      });

      return sale;
    });

    res.json(result);
  } catch (err) {
    console.error("Create Sale Error:", err);
    if (err.status === 403) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to create sale" });
  }
});

// 📦 Get all sales
router.get("/", async (req, res) => {
  try {
    const scope = await buildScope(prisma, req.user?.userId || 0);
    if (!scope.isAdmin && scope.stores.size === 0) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    const where = scope.isAdmin ? {} : { storeId: { in: Array.from(scope.stores) } };

    const sales = await prisma.sale.findMany({
      where,
      include: { 
        saleItems: {
          include: {
            product: true
          }
        }, 
        store: true 
      }
    });
    res.json(sales);
  } catch (err) {
    console.error("Get Sales Error:", err);
    if (err.status === 403) {
      return res.json([]);
    }
    res.status(500).json({ message: "Failed to fetch sales" });
  }
});

// 🔙 Create sale return - FIXED VERSION
router.post("/return", async (req, res) => {
  try {
    const { saleId, items } = req.body;

    console.log("Return request received:", { saleId, items });

    // Validate input
    if (!saleId) {
      return res.status(400).json({ 
        message: "Sale ID is required" 
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: "Return items are required" 
      });
    }

    // First, get the sale to access storeId and validate
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(saleId) },
      include: { 
        store: true,
        saleItems: {
          include: {
            product: true
          }
        } 
      }
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const scope = await buildScope(prisma, req.user?.userId || 0);
    ensureIdScope(scope, "store", sale.storeId);

    console.log("Found sale:", sale);

    // Validate return quantities don't exceed original sale quantities
    for (const returnItem of items) {
      const originalItem = sale.saleItems.find(
        si => si.productId === returnItem.productId
      );
      
      if (!originalItem) {
        return res.status(400).json({ 
          message: `Product ${returnItem.productId} was not part of the original sale` 
        });
      }
      
      if (returnItem.quantity > originalItem.quantity) {
        return res.status(400).json({ 
          message: `Return quantity for product ${returnItem.productId} exceeds original sale quantity (max: ${originalItem.quantity})` 
        });
      }
    }

    let totalAmount = 0;
    items.forEach(i => (totalAmount += i.unitPrice * i.quantity));

    console.log("Creating sale return with storeId:", sale.storeId);

    // Create sale return
    const saleReturn = await prisma.saleReturn.create({
      data: {
        saleId: parseInt(saleId),
        storeId: sale.storeId, // This was the missing field causing the error
        reference: `RETURN-${Date.now()}`,
        totalAmount,
        returnItems: {
          create: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity
          }))
        }
      },
      include: { 
        returnItems: {
          include: {
            product: true
          }
        } 
      }
    });

    console.log("Sale return created successfully:", saleReturn);

    // Increase stock back for each returned item
    for (const item of items) {
      try {
        const updatedStock = await prisma.storeProduct.update({
          where: {
            store_id_product_id: {
              store_id: sale.storeId,
              product_id: item.productId
            }
          },
          data: { stock: { increment: item.quantity } }
        });
        console.log(`Stock updated for product ${item.productId}:`, updatedStock.stock);
      } catch (stockError) {
        console.error(`Failed to update stock for product ${item.productId}:`, stockError);
        // Continue with other items even if one stock update fails
      }
    }

    res.json({
      success: true,
      message: "Return processed successfully",
      return: saleReturn
    });

  } catch (err) {
    console.error("Sale Return Error Details:", err);
    if (err.status === 403) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Handle specific Prisma errors
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        message: "Return reference already exists" 
      });
    }
    
    if (err.code === 'P2003') {
      return res.status(400).json({ 
        message: "Invalid sale or product reference" 
      });
    }

    if (err.code === 'P2022') {
      return res.status(500).json({ 
        message: "Database schema error: storeId column missing. Please run database migrations.",
        error: "Missing database column: storeId"
      });
    }
    
    res.status(500).json({ 
      message: "Failed to process sale return",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
