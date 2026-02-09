const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// General Ledger - list transactions with optional filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    const where = {};
    if (accountId) {
      where.accountId = parseInt(accountId);
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        account: true,
        bankAccount: true,
        sale: true,
        purchase: true,
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totals = transactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.added_to_account === true) acc.credit += amt;
      if (t.added_to_account === false) acc.debit += amt;
      acc.total += amt;
      return acc;
    }, { debit: 0, credit: 0, total: 0 });

    res.json({
      transactions,
      summary: {
        count: transactions.length,
        totalAmount: totals.total,
        totalDebit: totals.debit,
        totalCredit: totals.credit
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
