const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();
const crypto = require('crypto');
const { createNotification } = require('../utils/notificationHelper');

const toAmount = (value) => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const makeReference = (prefix) => {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
};

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

// Deposit/add money to account
router.post('/:id/deposit', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    const amount = toAmount(req.body?.amount);
    const note = req.body?.note || null;
    const paymentMethod = req.body?.payment_method || 'cash';
    const createdById = req.user?.userId;

    if (!accountId || !amount || !createdById) {
      return res.status(400).json({ error: 'account id, amount and authenticated user are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.accounts.findUnique({ where: { id: accountId } });
      if (!account) throw new Error('Account not found');
      if (String(account.status || '').toLowerCase() !== 'active') throw new Error('Account is not active');

      const updated = await tx.accounts.update({
        where: { id: accountId },
        data: { balance: { increment: amount } },
      });

      const trx = await tx.transactions.create({
        data: {
          reference: makeReference('ACC-DEP'),
          createdById,
          accountId,
          amount,
          added_to_account: true,
          payment_method: paymentMethod,
          purpose: 'Account Deposit',
          current_account_balance: updated.balance,
          note,
        },
      });

      return { account: updated, transaction: trx };
    });

    await createNotification(prisma, {
      title: `Account deposit (${result.account.name || result.account.id})`,
      description: `An account deposit of ${amount} was made to ${result.account.name || `account #${result.account.id}`}.`,
      forRole: 'admin',
      link: '/accounts/list'
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Withdraw money from account
router.post('/:id/withdraw', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    const amount = toAmount(req.body?.amount);
    const note = req.body?.note || null;
    const paymentMethod = req.body?.payment_method || 'cash';
    const createdById = req.user?.userId;

    if (!accountId || !amount || !createdById) {
      return res.status(400).json({ error: 'account id, amount and authenticated user are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.accounts.findUnique({ where: { id: accountId } });
      if (!account) throw new Error('Account not found');
      if (String(account.status || '').toLowerCase() !== 'active') throw new Error('Account is not active');
      if (Number(account.balance || 0) < amount) throw new Error('Insufficient account balance');

      const updated = await tx.accounts.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } },
      });

      const trx = await tx.transactions.create({
        data: {
          reference: makeReference('ACC-WDR'),
          createdById,
          accountId,
          amount,
          added_to_account: false,
          payment_method: paymentMethod,
          purpose: 'Account Withdraw',
          current_account_balance: updated.balance,
          note,
        },
      });

      return { account: updated, transaction: trx };
    });

    await createNotification(prisma, {
      title: `Account withdraw (${result.account.name || result.account.id})`,
      description: `An account withdrawal of ${amount} was made from ${result.account.name || `account #${result.account.id}`}.`,
      forRole: 'admin',
      link: '/accounts/list'
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Transfer money between accounts
router.post('/:id/transfer', async (req, res) => {
  try {
    const fromAccountId = parseInt(req.params.id, 10);
    const toAccountId = parseInt(req.body?.toAccountId, 10);
    const amount = toAmount(req.body?.amount);
    const note = req.body?.note || null;
    const paymentMethod = req.body?.payment_method || 'transfer';
    const createdById = req.user?.userId;

    if (!fromAccountId || !toAccountId || !amount || !createdById) {
      return res.status(400).json({ error: 'from account, to account, amount and authenticated user are required' });
    }
    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const [fromAccount, toAccount] = await Promise.all([
        tx.accounts.findUnique({ where: { id: fromAccountId } }),
        tx.accounts.findUnique({ where: { id: toAccountId } }),
      ]);

      if (!fromAccount || !toAccount) throw new Error('Account not found');
      if (String(fromAccount.status || '').toLowerCase() !== 'active') throw new Error('Source account is not active');
      if (String(toAccount.status || '').toLowerCase() !== 'active') throw new Error('Destination account is not active');
      if (Number(fromAccount.balance || 0) < amount) throw new Error('Insufficient source account balance');

      const [updatedFrom, updatedTo] = await Promise.all([
        tx.accounts.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: amount } },
        }),
        tx.accounts.update({
          where: { id: toAccountId },
          data: { balance: { increment: amount } },
        }),
      ]);

      const transferRef = makeReference('ACC-TRF');
      const [debitTx, creditTx] = await Promise.all([
        tx.transactions.create({
          data: {
            reference: `${transferRef}-OUT`,
            createdById,
            accountId: fromAccountId,
            amount,
            added_to_account: false,
            payment_method: paymentMethod,
            purpose: `Account Transfer To ${toAccount.name}`,
            current_account_balance: updatedFrom.balance,
            note,
          },
        }),
        tx.transactions.create({
          data: {
            reference: `${transferRef}-IN`,
            createdById,
            accountId: toAccountId,
            amount,
            added_to_account: true,
            payment_method: paymentMethod,
            purpose: `Account Transfer From ${fromAccount.name}`,
            current_account_balance: updatedTo.balance,
            note,
          },
        }),
      ]);

      return {
        fromAccount: updatedFrom,
        toAccount: updatedTo,
        transactions: [debitTx, creditTx],
      };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
