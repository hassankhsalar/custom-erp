const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { createTransaction } = require('../utils/transactionHelper');

const prisma = new PrismaClient();
const router = express.Router();

const EPSILON = 0.0001;
const generateReference = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// ✅ Add Supplier
router.post('/', async (req, res) => {
  try {
    const { name, mobile, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await prisma.supplier.create({
      data: { name, mobile, address },
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { deleted_at: false },
      orderBy: { id: 'desc' },
    });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: { id: parseInt(req.params.id), deleted_at: false },
    });

    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, mobile, address } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { name, mobile, address },
    });

    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Soft delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.update({
      where: { id: parseInt(req.params.id) },
      data: { deleted_at: true },
    });

    res.json({ message: 'Supplier archived successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear due for supplier by allocating amount to oldest due purchases first
router.post('/:id/clear-due', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id, 10);
    const clearAmount = parseFloat(req.body?.amount);

    if (!Number.isFinite(supplierId) || supplierId <= 0) {
      return res.status(400).json({ error: 'Invalid supplier ID' });
    }
    if (!Number.isFinite(clearAmount) || clearAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deleted_at: false },
      select: { id: true, name: true }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const purchases = await prisma.purchase.findMany({
      where: { supplierId },
      select: {
        id: true,
        reference: true,
        destinationType: true,
        destinationId: true,
        accountId: true,
        grandTotal: true,
        paidAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const duePurchases = purchases
      .map((purchase) => {
        const due = Math.max(0, (parseFloat(purchase.grandTotal) || 0) - (parseFloat(purchase.paidAmount) || 0));
        return { purchase, due };
      })
      .filter((row) => row.due > EPSILON);

    if (duePurchases.length === 0) {
      return res.status(400).json({ error: 'No due amount found for this supplier' });
    }

    let remaining = clearAmount;
    const allocations = [];

    await prisma.$transaction(async (tx) => {
      for (const row of duePurchases) {
        if (remaining <= EPSILON) break;

        const currentPurchase = await tx.purchase.findUnique({
          where: { id: row.purchase.id },
          select: {
            id: true,
            reference: true,
            destinationType: true,
            destinationId: true,
            accountId: true,
            grandTotal: true,
            paidAmount: true
          }
        });
        if (!currentPurchase) continue;

        const currentGrandTotal = parseFloat(currentPurchase.grandTotal) || 0;
        const currentPaid = parseFloat(currentPurchase.paidAmount) || 0;
        const currentDue = Math.max(0, currentGrandTotal - currentPaid);

        const requestedApply = Math.min(remaining, currentDue);
        if (requestedApply <= EPSILON) continue;

        const newPaidAmount = Math.min(currentGrandTotal, currentPaid + requestedApply);
        const actualApplied = Math.max(0, newPaidAmount - currentPaid);
        if (actualApplied <= EPSILON) continue;

        let resolvedAccountId = currentPurchase.accountId ? parseInt(currentPurchase.accountId, 10) : null;
        if (!resolvedAccountId && currentPurchase.destinationType && currentPurchase.destinationId) {
          const entityAccount = await tx.entityAccount.findFirst({
            where: {
              entityType: String(currentPurchase.destinationType).toLowerCase(),
              entityId: parseInt(currentPurchase.destinationId, 10),
              isPrimary: true
            },
            select: { accountId: true }
          });
          resolvedAccountId = entityAccount?.accountId || null;
        }

        if (!resolvedAccountId) {
          throw new Error(`No account found for purchase ${currentPurchase.reference || currentPurchase.id}`);
        }

        const account = await tx.accounts.findUnique({ where: { id: resolvedAccountId } });
        if (!account) {
          throw new Error(`Account not found for purchase ${currentPurchase.reference || currentPurchase.id}`);
        }

        await tx.purchase.update({
          where: { id: currentPurchase.id },
          data: { paidAmount: newPaidAmount, accountId: resolvedAccountId }
        });

        const updatedAccount = await tx.accounts.update({
          where: { id: resolvedAccountId },
          data: { balance: { decrement: actualApplied } }
        });

        await createTransaction(tx, {
          reference: generateReference('PUR-DUE'),
          createdById: req.user?.userId || 1,
          accountId: resolvedAccountId,
          purchaseId: currentPurchase.id,
          purpose: 'Supplier Due Clearance',
          added_to_account: false,
          amount: actualApplied,
          payment_method: 'due_clear',
          current_account_balance: updatedAccount.balance,
          note: `Due cleared for purchase ${currentPurchase.reference || currentPurchase.id}`
        });

        remaining -= actualApplied;
        allocations.push({
          purchaseId: currentPurchase.id,
          reference: currentPurchase.reference,
          amount: actualApplied
        });
      }
    });

    const appliedAmount = allocations.reduce((sum, row) => sum + row.amount, 0);

    let updatedSupplierDue = null;
    if (appliedAmount > EPSILON) {
      const updatedSupplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: { total_due: { decrement: appliedAmount } },
        select: { total_due: true }
      });
      updatedSupplierDue = parseFloat(updatedSupplier.total_due) || 0;
    }

    res.json({
      success: true,
      requestedAmount: clearAmount,
      appliedAmount,
      unappliedAmount: Math.max(0, clearAmount - appliedAmount),
      appliedCount: allocations.length,
      allocations,
      updatedSupplierDue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
