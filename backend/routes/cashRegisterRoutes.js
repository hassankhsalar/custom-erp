const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all cash registers
router.get('/', async (req, res) => {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(cashRegisters);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const validStatus = ['active', 'inactive', 'maintenance'];
    const finalStatus = status && validStatus.includes(status) ? status : 'active';
    
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
      const validStatus = ['active', 'inactive', 'maintenance'];
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
    const { amount, notes, userId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    
    if (cashRegister.status !== 'active') {
      return res.status(400).json({ error: 'Cannot add cash to inactive cash register' });
    }
    
    const updated = await prisma.cashRegister.update({
      where: { id: parseInt(req.params.id) },
      data: {
        cash_in_hand: { increment: parseFloat(amount) },
        updatedAt: new Date()
      }
    });
    
    res.json({
      message: `Added ${amount} to cash register`,
      previousBalance: cashRegister.cash_in_hand,
      newBalance: updated.cash_in_hand,
      cashRegister: updated
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Withdraw cash from cash register
router.post('/:id/withdraw-cash', async (req, res) => {
  try {
    const { amount, notes, userId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!cashRegister) {
      return res.status(404).json({ error: 'Cash register not found' });
    }
    
    if (cashRegister.status !== 'active') {
      return res.status(400).json({ error: 'Cannot withdraw from inactive cash register' });
    }
    
    if (cashRegister.cash_in_hand < amount) {
      return res.status(400).json({ 
        error: `Insufficient funds. Available: ${cashRegister.cash_in_hand}, Requested: ${amount}` 
      });
    }
    
    const updated = await prisma.cashRegister.update({
      where: { id: parseInt(req.params.id) },
      data: {
        cash_in_hand: { decrement: parseFloat(amount) },
        updatedAt: new Date()
      }
    });
    
    res.json({
      message: `Withdrew ${amount} from cash register`,
      previousBalance: cashRegister.cash_in_hand,
      newBalance: updated.cash_in_hand,
      cashRegister: updated
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;