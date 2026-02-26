const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { createTransaction } = require("../utils/transactionHelper");

const EPSILON = 0.0001;

const generateReference = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// Get customers
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for search
    const where = search
      ? {
          deleted_at: false,
          OR: [
            { name: { contains: search } },
            { mobile: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : { deleted_at: false };

    // Get total count for pagination
    const totalCount = await prisma.customer.count({ where });

    // Get paginated customers
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    });

    res.json({
      customers,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / take),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all customers
router.get("/all-customers", async (req, res) => {
  try {
    const { search } = req.query;

    // Build where clause for search
    const where = search
      ? {
          deleted_at: false,
          OR: [
            { name: { contains: search } },
            { mobile: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : { deleted_at: false };

    // Get paginated customers
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" }
    });

    res.json({
      customers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new customer
router.post("/", async (req, res) => {
  try {
    const { name, mobile, email, address } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: "Name and mobile are required" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email || null,
        address: address || null,
      },
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single customer by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findFirst({
      where: { id: parseInt(id), deleted_at: false },
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a customer
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, address } = req.body;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        mobile: mobile || undefined,
        email: email || null,
        address: address || null,
      },
    });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft delete a customer
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { deleted_at: true },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear due for customer by allocating amount to oldest due sales first
router.post("/:id/clear-due", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const clearAmount = parseFloat(req.body?.amount);

    if (!Number.isFinite(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    if (!Number.isFinite(clearAmount) || clearAmount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deleted_at: false },
      select: { id: true, name: true, total_due: true }
    });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const dueSales = await prisma.sale.findMany({
      where: {
        customerId,
        grandTotal: { gt: 0 }
      },
      select: {
        id: true,
        reference: true,
        shopId: true,
        grandTotal: true,
        paidAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    });

    let remaining = clearAmount;
    const allocations = dueSales
      .map((sale) => {
        const due = Math.max(0, (parseFloat(sale.grandTotal) || 0) - (parseFloat(sale.paidAmount) || 0));
        return { sale, due };
      })
      .filter((row) => row.due > EPSILON);

    if (allocations.length === 0) {
      return res.status(400).json({ error: "No due amount found for this customer" });
    }

    const appliedSales = [];

    await prisma.$transaction(async (tx) => {
      for (const row of allocations) {
        if (remaining <= EPSILON) break;

        const currentSale = await tx.sale.findUnique({
          where: { id: row.sale.id },
          select: {
            id: true,
            reference: true,
            shopId: true,
            grandTotal: true,
            paidAmount: true
          }
        });
        if (!currentSale) continue;

        const currentPaid = parseFloat(currentSale.paidAmount) || 0;
        const currentGrandTotal = parseFloat(currentSale.grandTotal) || 0;
        const currentDue = Math.max(0, currentGrandTotal - currentPaid);

        const requestedApply = Math.min(remaining, currentDue);
        if (requestedApply <= EPSILON) continue;

        const newPaidAmount = Math.min(currentGrandTotal, currentPaid + requestedApply);
        const actualApplied = Math.max(0, newPaidAmount - currentPaid);
        if (actualApplied <= EPSILON) continue;

        const entityAccount = await tx.entityAccount.findFirst({
          where: {
            entityType: "shop",
            entityId: currentSale.shopId,
            isPrimary: true
          },
          select: { accountId: true }
        });

        if (!entityAccount?.accountId) {
          throw new Error(`No primary account found for sale ${currentSale.reference || currentSale.id}`);
        }

        await tx.sale.update({
          where: { id: currentSale.id },
          data: {
            paidAmount: newPaidAmount,
            transactionStatus: (currentGrandTotal - newPaidAmount) <= EPSILON ? "closed" : "open"
          }
        });

        const updatedAccount = await tx.accounts.update({
          where: { id: entityAccount.accountId },
          data: { balance: { increment: actualApplied } }
        });

        await createTransaction(tx, {
          reference: generateReference("SALE-DUE"),
          createdById: req.user?.userId || 1,
          accountId: entityAccount.accountId,
          saleId: currentSale.id,
          purpose: "Customer Due Clearance",
          added_to_account: true,
          amount: actualApplied,
          payment_method: "due_clear",
          current_account_balance: updatedAccount.balance,
          note: `Due cleared for sale ${currentSale.reference || currentSale.id}`
        });

        remaining -= actualApplied;
        appliedSales.push({
          saleId: currentSale.id,
          reference: currentSale.reference,
          amount: actualApplied
        });
      }

      const aggregate = await tx.sale.aggregate({
        where: { customerId },
        _sum: { grandTotal: true, paidAmount: true }
      });
      const totalGrand = parseFloat(aggregate?._sum?.grandTotal) || 0;
      const totalPaid = parseFloat(aggregate?._sum?.paidAmount) || 0;
      const totalDue = Math.max(0, totalGrand - totalPaid);

      if (customerId > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            total_due: totalDue,
            total_purchase: totalPaid
          }
        });
      }
    });

    const totalApplied = appliedSales.reduce((sum, row) => sum + row.amount, 0);
    res.json({
      success: true,
      requestedAmount: clearAmount,
      appliedAmount: totalApplied,
      unappliedAmount: Math.max(0, clearAmount - totalApplied),
      appliedCount: appliedSales.length,
      allocations: appliedSales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
