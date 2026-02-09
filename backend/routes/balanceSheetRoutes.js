const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({
      orderBy: { name: 'asc' }
    });

    const transactions = await prisma.transactions.findMany({
      select: {
        accountId: true,
        amount: true,
        added_to_account: true
      }
    });

    const totalsByAccount = {};
    transactions.forEach(t => {
      const id = t.accountId;
      if (!totalsByAccount[id]) {
        totalsByAccount[id] = { debit: 0, credit: 0 };
      }
      const amt = parseFloat(t.amount) || 0;
      if (t.added_to_account === true) totalsByAccount[id].credit += amt;
      if (t.added_to_account === false) totalsByAccount[id].debit += amt;
    });

    const rows = accounts.map(a => {
      const totals = totalsByAccount[a.id] || { debit: 0, credit: 0 };
      return {
        id: a.id,
        name: a.name,
        account_number: a.account_number,
        debit: totals.debit,
        credit: totals.credit,
        balance: parseFloat(a.balance || 0)
      };
    });

    res.json({ accounts: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
