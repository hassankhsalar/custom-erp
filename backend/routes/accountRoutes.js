const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new account
router.post('/', async (req, res) => {
  try {
    const { name, account_number, balance } = req.body;
    
    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Account name is required' });
    }
    
    if (!account_number || !account_number.trim()) {
      return res.status(400).json({ error: 'Account number is required' });
    }
    
    // Remove any non-digit characters if you want only numbers
    const cleanAccountNumber = account_number.toString().replace(/\D/g, '');
    
    if (!cleanAccountNumber) {
      return res.status(400).json({ error: 'Valid account number is required' });
    }
    
    // Check if account number already exists
    const existingAccount = await prisma.accounts.findFirst({
      where: { account_number: cleanAccountNumber }
    });
    
    if (existingAccount) {
      return res.status(400).json({ error: 'Account number already exists' });
    }
    
    // Parse balance, default to 0 if invalid
    const parsedBalance = parseFloat(balance);
    const finalBalance = isNaN(parsedBalance) ? 0 : parsedBalance;
    
    const account = await prisma.accounts.create({
      data: {
        name: name.trim(),
        account_number: cleanAccountNumber,
        balance: finalBalance,
        status: 'active' // Set to active by default
      }
    });
    
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get single account
router.get('/:id', async (req, res) => {
  try {
    const account = await prisma.accounts.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    const { name, account_number, balance, status } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (account_number !== undefined) {
      const cleanAccountNumber = account_number.toString().replace(/\D/g, '');
      if (cleanAccountNumber) {
        updateData.account_number = cleanAccountNumber;
      }
    }
    if (balance !== undefined) {
      const parsedBalance = parseFloat(balance);
      updateData.balance = isNaN(parsedBalance) ? 0 : parsedBalance;
    }
    if (status !== undefined) updateData.status = status;
    
    const account = await prisma.accounts.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    
    res.json(account);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    await prisma.accounts.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;