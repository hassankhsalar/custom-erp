const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all bank accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      orderBy: { id: 'desc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create bank account
router.post('/', async (req, res) => {
  try {
    const { name, account_number, starting_balance, current_balance, withdraw_charge } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Bank name is required' });
    }

    if (!account_number || !account_number.trim()) {
      return res.status(400).json({ error: 'Account number is required' });
    }

    const cleanAccountNumber = account_number.toString().replace(/\s+/g, '');
    const existing = await prisma.bankAccount.findFirst({
      where: { account_number: cleanAccountNumber }
    });
    if (existing) {
      return res.status(400).json({ error: 'Account number already exists' });
    }

    const startBal = parseFloat(starting_balance);
    const currentBal = current_balance !== undefined ? parseFloat(current_balance) : startBal;
    const withdrawCharge = withdraw_charge !== undefined ? parseFloat(withdraw_charge) : null;

    const account = await prisma.bankAccount.create({
      data: {
        name: name.trim(),
        account_number: cleanAccountNumber,
        starting_balance: Number.isFinite(startBal) ? startBal : 0,
        current_balance: Number.isFinite(currentBal) ? currentBal : (Number.isFinite(startBal) ? startBal : 0),
        withdraw_charge: Number.isFinite(withdrawCharge) ? withdrawCharge : null
      }
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update bank account
router.put('/:id', async (req, res) => {
  try {
    const { name, account_number, starting_balance, current_balance, withdraw_charge } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (account_number !== undefined) {
      updateData.account_number = account_number.toString().replace(/\s+/g, '');
    }
    if (starting_balance !== undefined) {
      const val = parseFloat(starting_balance);
      updateData.starting_balance = Number.isFinite(val) ? val : 0;
    }
    if (current_balance !== undefined) {
      const val = parseFloat(current_balance);
      updateData.current_balance = Number.isFinite(val) ? val : 0;
    }
    if (withdraw_charge !== undefined) {
      const val = parseFloat(withdraw_charge);
      updateData.withdraw_charge = Number.isFinite(val) ? val : null;
    }

    const account = await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    res.json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete bank account
router.delete('/:id', async (req, res) => {
  try {
    await prisma.bankAccount.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
