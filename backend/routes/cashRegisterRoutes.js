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

const getActiveShopIdForRegister = async (tx, cashRegisterId) => {
  const activeAssignment = await tx.cashRegisterAssignment.findFirst({
    where: { cashRegisterId, isActive: true, entityType: 'shop' },
    orderBy: { assignedAt: 'desc' },
    select: { entityId: true },
  });
  return activeAssignment?.entityId || null;
};

// Get all cash registers
router.get('/', async (req, res) => {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(cashRegisters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all cash register records
router.get('/records', async (req, res) => {
  try {
    const rows = await prisma.cashRegisterRecord.findMany({
      include: {
        cashRegister: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, username: true, email: true } },
        closedBy: { select: { id: true, name: true, username: true, email: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { opening_at: 'desc' },
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get records for one cash register
router.get('/:id/records', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await prisma.cashRegisterRecord.findMany({
      where: { cashRegisterId: id },
      include: {
        user: { select: { id: true, name: true, username: true, email: true } },
        closedBy: { select: { id: true, name: true, username: true, email: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { opening_at: 'desc' },
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all cash register transactions
router.get('/transactions', async (req, res) => {
  try {
    const rows = await prisma.transactions.findMany({
      where: {
        cashRegisterId: { not: null },
      },
      include: {
        cashRegister: { select: { id: true, name: true } },
        account: { select: { id: true, name: true, account_number: true } },
        bankAccount: { select: { id: true, name: true, account_number: true } },
        createdBy: { select: { id: true, name: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get transactions for one cash register
router.get('/:id/transactions', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const rows = await prisma.transactions.findMany({
      where: { cashRegisterId: id },
      include: {
        account: { select: { id: true, name: true, account_number: true } },
        bankAccount: { select: { id: true, name: true, account_number: true } },
        createdBy: { select: { id: true, name: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get single cash register
router.get('/:id', async (req, res) => {
  try {
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        assignments: {
          include: {
            assignedBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    
    res.json(cashRegister);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new cash register
router.post('/', async (req, res) => {
  try {
    const { name, cash_in_hand, status, notes } = req.body;
    
    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Cash register name is required' });
    }
    
    // Check if cash register with same name already exists
    const existingRegister = await prisma.cashRegister.findFirst({
      where: { name: name.trim() }
    });
    
    if (existingRegister) {
      return res.status(400).json({ error: 'Cash register with this name already exists' });
    }
    
    // Parse cash in hand
    const parsedCash = parseFloat(cash_in_hand);
    const finalCash = isNaN(parsedCash) ? 0 : Math.max(0, parsedCash);
    
    // Validate status
    const validStatus = ['active', 'closed', 'inactive'];
    const finalStatus = status && validStatus.includes(status) ? status : 'closed';
    
    const cashRegister = await prisma.cashRegister.create({
      data: {
        name: name.trim(),
        cash_in_hand: finalCash,
        status: finalStatus,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    res.status(201).json(cashRegister);
  } catch (error) {
    console.error('Error creating cash register:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update cash register
router.put('/:id', async (req, res) => {
  try {
    const { name, cash_in_hand, status } = req.body;
    
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (cash_in_hand !== undefined) {
      const parsedCash = parseFloat(cash_in_hand);
      updateData.cash_in_hand = isNaN(parsedCash) ? 0 : Math.max(0, parsedCash);
    }
    if (status !== undefined) {
      const validStatus = ['active', 'closed', 'inactive'];
      if (validStatus.includes(status)) {
        updateData.status = status;
      }
    }
    
    updateData.updatedAt = new Date();
    
    const cashRegister = await prisma.cashRegister.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    
    res.json(cashRegister);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete cash register
router.delete('/:id', async (req, res) => {
  try {
    // Check if cash register has any active assignments
    const activeAssignments = await prisma.cashRegisterAssignment.findFirst({
      where: {
        cashRegisterId: parseInt(req.params.id),
        isActive: true
      }
    });
    
    if (activeAssignments) {
      return res.status(400).json({ 
        error: 'Cannot delete cash register with active assignments. Please unassign it first.' 
      });
    }
    
    await prisma.cashRegister.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ message: 'Cash register deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add cash to cash register
router.post('/:id/add-cash', async (req, res) => {
  try {
    const cashRegisterId = parseInt(req.params.id, 10);
    const amount = toAmount(req.body?.amount);
    const notes = req.body?.notes || null;
    const accountId = parseInt(req.body?.accountId, 10);
    const paymentMethod = String(req.body?.payment_method || 'cash').toLowerCase();
    const userId = req.user?.userId;

    if (!cashRegisterId || !amount || !accountId || !userId) {
      return res.status(400).json({ error: 'cash register id, amount and accountId are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const [cashRegister, account] = await Promise.all([
        tx.cashRegister.findUnique({ where: { id: cashRegisterId } }),
        tx.accounts.findUnique({ where: { id: accountId } }),
      ]);

      if (!cashRegister) throw new Error('Cash register not found');
      if ((cashRegister.status || '').toLowerCase() === 'inactive') {
        throw new Error('Inactive cash register cannot receive deposits');
      }
      if (!account) throw new Error('Account not found');
      if ((account.status || '').toLowerCase() !== 'active') throw new Error('Account is not active');
      const [updatedRegister, updatedAccount] = await Promise.all([
        tx.cashRegister.update({
          where: { id: cashRegisterId },
          data: { cash_in_hand: { increment: amount }, updatedAt: new Date() },
        }),
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        }),
      ]);

      const [depositLog, transaction] = await Promise.all([
        tx.cashRegisterDeposit.create({
          data: {
            time: new Date(),
            amount,
            cashRegisterId,
            userId,
            note: notes,
            accountId,
          },
        }),
        tx.transactions.create({
          data: {
            reference: makeReference('CR-DEP'),
            createdById: userId,
            cashRegisterId,
            accountId,
            purpose: 'Cash Register Deposit',
            added_to_account: true,
            amount,
            payment_method: paymentMethod,
            current_account_balance: updatedAccount.balance,
            note: notes,
          },
        }),
      ]);

      return { cashRegister: updatedRegister, account: updatedAccount, depositLog, transaction };
    });

    await createNotification(prisma, {
      title: `Cash register deposit (${result.cashRegister.name || result.cashRegister.id})`,
      description: `Cash register deposit of ${amount} was recorded for ${result.cashRegister.name || `register #${result.cashRegister.id}`}.`,
      forRole: 'admin',
      link: '/accounts/cash-register/list'
    });

    res.json({ success: true, message: `Added ${amount} to cash register`, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Withdraw cash from cash register
router.post('/:id/withdraw-cash', async (req, res) => {
  try {
    const cashRegisterId = parseInt(req.params.id, 10);
    const amount = toAmount(req.body?.amount);
    const notes = req.body?.notes || null;
    const accountId = parseInt(req.body?.accountId, 10);
    const paymentMethod = String(req.body?.payment_method || 'cash').toLowerCase();
    const userId = req.user?.userId;

    if (!cashRegisterId || !amount || !accountId || !userId) {
      return res.status(400).json({ error: 'cash register id, amount and accountId are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const [cashRegister, account] = await Promise.all([
        tx.cashRegister.findUnique({ where: { id: cashRegisterId } }),
        tx.accounts.findUnique({ where: { id: accountId } }),
      ]);

      if (!cashRegister) throw new Error('Cash register not found');
      if ((cashRegister.status || '').toLowerCase() === 'inactive') {
        throw new Error('Inactive cash register cannot be used for withdrawal');
      }
      if (Number(cashRegister.cash_in_hand || 0) < amount) {
        throw new Error(`Insufficient register cash. Available: ${cashRegister.cash_in_hand}`);
      }
      if (!account) throw new Error('Account not found');
      if ((account.status || '').toLowerCase() !== 'active') throw new Error('Account is not active');
      if (Number(account.balance || 0) < amount) throw new Error('Insufficient account balance');
      const [updatedRegister, updatedAccount] = await Promise.all([
        tx.cashRegister.update({
          where: { id: cashRegisterId },
          data: { cash_in_hand: { decrement: amount }, updatedAt: new Date() },
        }),
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { decrement: amount } },
        }),
      ]);

      const [withdrawLog, transaction] = await Promise.all([
        tx.cashRegisterWithdraw.create({
          data: {
            time: new Date(),
            amount,
            cashRegisterId,
            userId,
            note: notes,
            accountId,
          },
        }),
        tx.transactions.create({
          data: {
            reference: makeReference('CR-WDR'),
            createdById: userId,
            cashRegisterId,
            accountId,
            purpose: 'Cash Register Withdraw',
            added_to_account: false,
            amount,
            payment_method: paymentMethod,
            current_account_balance: updatedAccount.balance,
            note: notes,
          },
        }),
      ]);

      return { cashRegister: updatedRegister, account: updatedAccount, withdrawLog, transaction };
    });

    await createNotification(prisma, {
      title: `Cash register withdraw (${result.cashRegister.name || result.cashRegister.id})`,
      description: `Cash register withdrawal of ${amount} was recorded for ${result.cashRegister.name || `register #${result.cashRegister.id}`}.`,
      forRole: 'admin',
      link: '/accounts/cash-register/list'
    });

    res.json({ success: true, message: `Withdrew ${amount} from cash register`, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update cash register status with open/close workflow
router.put('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const targetStatus = String(req.body?.status || '').toLowerCase();
    const userId = req.user?.userId;

    if (!id || !userId) return res.status(400).json({ error: 'Invalid request' });
    if (!['active', 'closed', 'inactive'].includes(targetStatus)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, closed, or inactive' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const cashRegister = await tx.cashRegister.findUnique({ where: { id } });
      if (!cashRegister) throw new Error('Cash register not found');
      const currentStatus = String(cashRegister.status || 'closed').toLowerCase();

      if (currentStatus === targetStatus) {
        return { noOp: true, message: 'Status unchanged', cashRegister };
      }

      if (currentStatus === 'inactive' && targetStatus === 'closed') {
        const updated = await tx.cashRegister.update({
          where: { id },
          data: { status: 'closed', updatedAt: new Date() },
        });
        return { noOp: false, message: 'Cash register moved to closed', cashRegister: updated };
      }
      if (currentStatus === 'inactive' && targetStatus === 'active') {
        const shopId = await getActiveShopIdForRegister(tx, id);
        await tx.cashRegisterRecord.create({
          data: {
            cashRegisterId: id,
            opening_at: new Date(),
            starting_cash: Number(cashRegister.cash_in_hand || 0),
            shopId,
            userId,
          },
        });
        const updated = await tx.cashRegister.update({
          where: { id },
          data: { status: 'active', last_opened: new Date(), updatedAt: new Date() },
        });
        return { noOp: false, message: 'Cash register opened', cashRegister: updated };
      }
      if (currentStatus === 'closed' && targetStatus === 'inactive') {
        const updated = await tx.cashRegister.update({
          where: { id },
          data: { status: 'inactive', updatedAt: new Date() },
        });
        return { noOp: false, message: 'Cash register deactivated', cashRegister: updated };
      }
      if (currentStatus === 'active' && targetStatus === 'inactive') {
        throw new Error('Cannot deactivate an active cash register. Close it first.');
      }
      if (currentStatus === 'closed' && targetStatus === 'active') {
        const shopId = await getActiveShopIdForRegister(tx, id);
        await tx.cashRegisterRecord.create({
          data: {
            cashRegisterId: id,
            opening_at: new Date(),
            starting_cash: Number(cashRegister.cash_in_hand || 0),
            shopId,
            userId,
          },
        });
        const updated = await tx.cashRegister.update({
          where: { id },
          data: { status: 'active', last_opened: new Date(), updatedAt: new Date() },
        });
        return { noOp: false, message: 'Cash register opened', cashRegister: updated };
      }
      if (currentStatus === 'active' && targetStatus === 'closed') {
        const openRecord = await tx.cashRegisterRecord.findFirst({
          where: { cashRegisterId: id, closing_at: null },
          orderBy: { opening_at: 'desc' },
        });
        if (openRecord) {
          await tx.cashRegisterRecord.update({
            where: { id: openRecord.id },
            data: {
              closing_at: new Date(),
              ending_cash: Number(cashRegister.cash_in_hand || 0),
              closedById: userId,
            },
          });
        }
        const updated = await tx.cashRegister.update({
          where: { id },
          data: { status: 'closed', last_closed: new Date(), updatedAt: new Date() },
        });
        return { noOp: false, message: 'Cash register closed', cashRegister: updated };
      }

      return { noOp: true, message: 'Transition ignored by policy', cashRegister };
    });

    if (!result.noOp && (targetStatus === 'active' || targetStatus === 'closed')) {
      await createNotification(prisma, {
        title: `Cash register ${targetStatus === 'active' ? 'opened' : 'closed'} (${result.cashRegister.name || result.cashRegister.id})`,
        description: `Cash register ${result.cashRegister.name || `#${result.cashRegister.id}`} is now ${targetStatus}.`,
        forRole: 'admin',
        link: '/accounts/cash-register/list'
      });
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
