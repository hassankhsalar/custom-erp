const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();
const { createNotification } = require('../utils/notificationHelper');

// Get all entities (stores, shops, factories) with their assigned cash registers
router.get('/entities', async (req, res) => {
  try {
    // Get all stores, shops, and factories
    const [stores, shops, factories, assignments] = await Promise.all([
      prisma.store.findMany({ where: { deleted_at: false } }),
      prisma.shop.findMany({ where: { deleted_at: false } }),
      prisma.factory.findMany({ where: { deleted_at: false } }),
      prisma.cashRegisterAssignment.findMany({
        where: { isActive: true, cashRegister: { deleted_at: false } },
        include: {
          cashRegister: true,
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    ]);

    // Combine all entities
    const entities = [
      ...stores.map(store => ({
        id: store.id,
        name: store.name,
        type: 'store',
        address: store.address,
        manager: store.store_keeper,
        mobile: store.mobile,
        email: null,
        assignedCashRegisters: assignments.filter(a => 
          a.entityType === 'store' && a.entityId === store.id
        )
      })),
      ...shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        type: 'shop',
        address: shop.address,
        manager: shop.shop_keeper,
        mobile: shop.mobile,
        email: null,
        assignedCashRegisters: assignments.filter(a => 
          a.entityType === 'shop' && a.entityId === shop.id
        )
      })),
      ...factories.map(factory => ({
        id: factory.id,
        name: factory.name,
        type: 'factory',
        address: factory.address,
        manager: factory.manager,
        mobile: factory.phone,
        email: factory.email,
        assignedCashRegisters: assignments.filter(a => 
          a.entityType === 'factory' && a.entityId === factory.id
        )
      }))
    ];

    res.json(entities);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available cash registers for assignment
router.get('/available-cash-registers', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    
    const cashRegisters = await prisma.cashRegister.findMany({
      where: {
        status: status,
        deleted_at: false,
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(cashRegisters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all cash registers (including assigned ones with assignment info)
router.get('/all-cash-registers', async (req, res) => {
  try {
    const cashRegisters = await prisma.cashRegister.findMany({
      where: { deleted_at: false },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            assignedBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(cashRegisters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign cash register to entity
router.post('/assign', async (req, res) => {
  try {
    const { entityType, entityId, cashRegisterId, notes, assignedById } = req.body;

    // Validate input
    if (!['store', 'shop', 'factory'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type. Must be store, shop, or factory' });
    }

    if (!entityId || !cashRegisterId) {
      return res.status(400).json({ error: 'Entity ID and Cash Register ID are required' });
    }

    // Check if cash register exists
    const cashRegister = await prisma.cashRegister.findFirst({
      where: { id: parseInt(cashRegisterId), deleted_at: false }
    });

    if (!cashRegister) {
      return res.status(404).json({ error: 'Cash register not found' });
    }

    // Check if cash register is already active
    if (cashRegister.status !== 'active') {
      return res.status(400).json({ error: 'Cash register is not active' });
    }

    // Check if entity exists based on type
    let entityExists = false;
    let entityName = '';
    
    try {
      switch (entityType) {
        case 'store':
          const store = await prisma.store.findUnique({ 
            where: { id: parseInt(entityId) } 
          });
          entityExists = store !== null;
          entityName = store?.name || '';
          break;
          
        case 'shop':
          const shop = await prisma.shop.findUnique({ 
            where: { id: parseInt(entityId) } 
          });
          entityExists = shop !== null;
          entityName = shop?.name || '';
          break;
          
        case 'factory':
          const factory = await prisma.factory.findUnique({ 
            where: { id: parseInt(entityId) } 
          });
          entityExists = factory !== null;
          entityName = factory?.name || '';
          break;
      }
    } catch (error) {
      return res.status(404).json({ error: `${entityType} not found` });
    }

    if (!entityExists) {
      return res.status(404).json({ error: `${entityType} not found` });
    }

    // Check if assignment already exists and is active
    const existingAssignment = await prisma.cashRegisterAssignment.findFirst({
      where: {
        entityType,
        entityId: parseInt(entityId),
        cashRegisterId: parseInt(cashRegisterId),
        isActive: true
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Cash register already assigned to this entity' });
    }

    // Check if this cash register is already assigned to another entity
    const alreadyAssigned = await prisma.cashRegisterAssignment.findFirst({
      where: {
        cashRegisterId: parseInt(cashRegisterId),
        isActive: true,
        NOT: {
          AND: [
            { entityType: entityType },
            { entityId: parseInt(entityId) }
          ]
        }
      }
    });

    if (alreadyAssigned) {
      return res.status(400).json({ 
        error: 'This cash register is already assigned to another entity. Please unassign it first.' 
      });
    }

    // Prepare assignment data
    const assignmentData = {
      entityType,
      entityId: parseInt(entityId),
      cashRegisterId: parseInt(cashRegisterId),
      assignedAt: new Date(),
      isActive: true
    };

    // Add notes if provided
    if (notes) {
      assignmentData.notes = notes;
    }

    // Add assignedBy if provided
    if (assignedById) {
      assignmentData.assignedById = parseInt(assignedById);
    }

    // Create the assignment
    const assignment = await prisma.cashRegisterAssignment.create({
      data: assignmentData,
      include: {
        cashRegister: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning cash register:', error);
    res.status(400).json({ error: error.message });
  }
});

// Assign multiple cash registers to an entity
router.post('/assign-multiple', async (req, res) => {
  try {
    const { entityType, entityId, cashRegisterIds, notes, assignedById } = req.body;

    // Validate input
    if (!['store', 'shop', 'factory'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (!entityId || !cashRegisterIds || !Array.isArray(cashRegisterIds)) {
      return res.status(400).json({ error: 'Entity ID and Cash Register IDs array are required' });
    }

    if (cashRegisterIds.length === 0) {
      return res.status(400).json({ error: 'At least one cash register ID is required' });
    }

    // Check if entity exists
    let entityExists = false;
    try {
      switch (entityType) {
        case 'store':
          entityExists = await prisma.store.findUnique({ where: { id: parseInt(entityId) } }) !== null;
          break;
        case 'shop':
          entityExists = await prisma.shop.findUnique({ where: { id: parseInt(entityId) } }) !== null;
          break;
        case 'factory':
          entityExists = await prisma.factory.findUnique({ where: { id: parseInt(entityId) } }) !== null;
          break;
      }
    } catch (error) {
      return res.status(404).json({ error: `${entityType} not found` });
    }

    if (!entityExists) {
      return res.status(404).json({ error: `${entityType} not found` });
    }

    const results = [];
    const errors = [];

    // Process each cash register assignment
    for (const cashRegisterId of cashRegisterIds) {
      try {
        // Check if cash register exists and is active
        const cashRegister = await prisma.cashRegister.findFirst({
          where: { id: parseInt(cashRegisterId), deleted_at: false }
        });

        if (!cashRegister) {
          errors.push(`Cash register ID ${cashRegisterId} not found`);
          continue;
        }

        if (cashRegister.status !== 'active') {
          errors.push(`Cash register "${cashRegister.name}" is not active`);
          continue;
        }

        // Check if already assigned to this entity
        const existingAssignment = await prisma.cashRegisterAssignment.findFirst({
          where: {
            entityType,
            entityId: parseInt(entityId),
            cashRegisterId: parseInt(cashRegisterId),
            isActive: true
          }
        });

        if (existingAssignment) {
          errors.push(`Cash register "${cashRegister.name}" already assigned to this entity`);
          continue;
        }

        // Check if assigned to another entity
        const alreadyAssigned = await prisma.cashRegisterAssignment.findFirst({
          where: {
            cashRegisterId: parseInt(cashRegisterId),
            isActive: true,
            NOT: {
              AND: [
                { entityType: entityType },
                { entityId: parseInt(entityId) }
              ]
            }
          }
        });

        if (alreadyAssigned) {
          errors.push(`Cash register "${cashRegister.name}" already assigned to another entity`);
          continue;
        }

        // Prepare assignment data
        const assignmentData = {
          entityType,
          entityId: parseInt(entityId),
          cashRegisterId: parseInt(cashRegisterId),
          assignedAt: new Date(),
          isActive: true
        };

        if (notes) assignmentData.notes = notes;
        if (assignedById) assignmentData.assignedById = parseInt(assignedById);

        // Create assignment
        const assignment = await prisma.cashRegisterAssignment.create({
          data: assignmentData,
          include: {
            cashRegister: true
          }
        });

        results.push(assignment);
      } catch (error) {
        errors.push(`Error assigning cash register ID ${cashRegisterId}: ${error.message}`);
      }
    }

    res.status(201).json({
      success: results.length > 0,
      assigned: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Assigned ${results.length} cash register(s) successfully${errors.length > 0 ? `, with ${errors.length} error(s)` : ''}`
    });
  } catch (error) {
    console.error('Error assigning multiple cash registers:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get cash register assignments for an entity
router.get('/entity/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['store', 'shop', 'factory'].includes(type)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const assignments = await prisma.cashRegisterAssignment.findMany({
      where: {
        entityType: type,
        entityId: parseInt(id),
        isActive: true
      },
      include: {
        cashRegister: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching entity assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unassign cash register (soft delete - set isActive to false)
router.put('/unassign/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { unassignReason } = req.body;

    const assignment = await prisma.cashRegisterAssignment.findUnique({
      where: { id: parseInt(id) },
      include: { cashRegister: true }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update assignment to inactive
    const updated = await prisma.cashRegisterAssignment.update({
      where: { id: parseInt(id) },
      data: { 
        isActive: false,
        notes: unassignReason ? `${assignment.notes || ''}\nUnassigned: ${unassignReason}`.trim() : assignment.notes
      },
      include: {
        cashRegister: true,
        assignedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Cash register unassigned successfully',
      assignment: updated
    });
  } catch (error) {
    console.error('Error unassigning cash register:', error);
    res.status(400).json({ error: error.message });
  }
});

// Unassign all cash registers from an entity
router.put('/unassign-all/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { unassignReason } = req.body;

    if (!['store', 'shop', 'factory'].includes(type)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Update all active assignments for this entity to inactive
    const result = await prisma.cashRegisterAssignment.updateMany({
      where: {
        entityType: type,
        entityId: parseInt(id),
        isActive: true
      },
      data: { 
        isActive: false,
        notes: unassignReason ? (prisma.cashRegisterAssignment.fields.notes + `\nUnassigned all: ${unassignReason}`) : undefined
      }
    });

    res.json({
      message: `Unassigned ${result.count} cash register(s) from ${type}`,
      count: result.count
    });
  } catch (error) {
    console.error('Error unassigning all cash registers:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update cash register status
router.put('/cash-register/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;

    if (!['active', 'closed', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be active, closed, or inactive' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cashRegister = await tx.cashRegister.findFirst({
        where: { id: parseInt(id), deleted_at: false }
      });
      if (!cashRegister) {
        throw new Error('Cash register not found');
      }

      const currentStatus = String(cashRegister.status || 'closed').toLowerCase();
      if (currentStatus === status) return cashRegister;

      if (currentStatus === 'inactive' && status === 'closed') {
        return tx.cashRegister.update({
          where: { id: parseInt(id) },
          data: { status: 'closed', updatedAt: new Date() },
        });
      }
      if (currentStatus === 'inactive' && status === 'active') {
        const activeShopAssignment = await tx.cashRegisterAssignment.findFirst({
          where: { cashRegisterId: parseInt(id), isActive: true, entityType: 'shop' },
          orderBy: { assignedAt: 'desc' },
          select: { entityId: true },
        });
        await tx.cashRegisterRecord.create({
          data: {
            cashRegisterId: parseInt(id),
            opening_at: new Date(),
            starting_cash: Number(cashRegister.cash_in_hand || 0),
            shopId: activeShopAssignment?.entityId || null,
            userId: userId || 1,
          },
        });
        return tx.cashRegister.update({
          where: { id: parseInt(id) },
          data: { status: 'active', last_opened: new Date(), updatedAt: new Date() },
        });
      }
      if (currentStatus === 'active' && status === 'inactive') {
        throw new Error('Cannot deactivate an active cash register. Close it first.');
      }

      if (currentStatus === 'closed' && status === 'active') {
        const activeShopAssignment = await tx.cashRegisterAssignment.findFirst({
          where: { cashRegisterId: parseInt(id), isActive: true, entityType: 'shop' },
          orderBy: { assignedAt: 'desc' },
          select: { entityId: true },
        });
        await tx.cashRegisterRecord.create({
          data: {
            cashRegisterId: parseInt(id),
            opening_at: new Date(),
            starting_cash: Number(cashRegister.cash_in_hand || 0),
            shopId: activeShopAssignment?.entityId || null,
            userId: userId || 1,
          },
        });
        return tx.cashRegister.update({
          where: { id: parseInt(id) },
          data: { status: 'active', last_opened: new Date(), updatedAt: new Date() },
        });
      }

      if (currentStatus === 'active' && status === 'closed') {
        const openRecord = await tx.cashRegisterRecord.findFirst({
          where: { cashRegisterId: parseInt(id), closing_at: null },
          orderBy: { opening_at: 'desc' },
        });
        if (openRecord) {
          await tx.cashRegisterRecord.update({
            where: { id: openRecord.id },
            data: {
              closing_at: new Date(),
              ending_cash: Number(cashRegister.cash_in_hand || 0),
              closedById: userId || openRecord.userId,
            },
          });
        }
        return tx.cashRegister.update({
          where: { id: parseInt(id) },
          data: { status: 'closed', last_closed: new Date(), updatedAt: new Date() },
        });
      }

      if (currentStatus === 'closed' && status === 'inactive') {
        return tx.cashRegister.update({
          where: { id: parseInt(id) },
          data: { status: 'inactive', updatedAt: new Date() },
        });
      }

      return cashRegister;
    });

    if (['active', 'closed'].includes(status)) {
      await createNotification(prisma, {
        title: `Cash register ${status === 'active' ? 'opened' : 'closed'} (${updated.name || updated.id})`,
        description: `Cash register ${updated.name || `#${updated.id}`} is now ${status}.`,
        forRole: 'admin',
        link: '/accounts/cash-register/list'
      });
    }

    res.json({
      message: `Cash register status updated to ${status}`,
      cashRegister: updated
    });
  } catch (error) {
    console.error('Error updating cash register status:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalEntities,
      totalCashRegisters,
      assignedCashRegisters,
      unassignedCashRegisters,
      assignmentsByType
    ] = await Promise.all([
      // Total entities
      prisma.$queryRaw`SELECT COUNT(*) as count FROM (SELECT id FROM Store UNION SELECT id FROM Shop UNION SELECT id FROM Factory) as entities`,
      
      // Total cash registers
      prisma.cashRegister.count({ where: { deleted_at: false } }),
      
      // Assigned cash registers
      prisma.cashRegisterAssignment.count({ where: { isActive: true } }),
      
      // Unassigned cash registers
      prisma.cashRegister.count({
        where: {
          status: 'active',
          deleted_at: false,
          NOT: {
            assignments: {
              some: { isActive: true }
            }
          }
        }
      }),
      
      // Assignments by type
      prisma.cashRegisterAssignment.groupBy({
        by: ['entityType'],
        where: { isActive: true },
        _count: true
      })
    ]);

    res.json({
      totalEntities: Number(totalEntities[0].count),
      totalCashRegisters,
      assignedCashRegisters,
      unassignedCashRegisters,
      assignmentsByType: assignmentsByType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {}),
      assignmentPercentage: totalCashRegisters > 0 ? 
        Math.round((assignedCashRegisters / totalCashRegisters) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search entities
router.get('/search', async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchConditions = [];
    
    // Build search conditions for stores
    if (!type || type === 'store') {
      searchConditions.push(
        prisma.store.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { store_keeper: { contains: query, mode: 'insensitive' } },
              { mobile: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 10
        }).then(stores => stores.map(s => ({ ...s, type: 'store' })))
      );
    }
    
    // Build search conditions for shops
    if (!type || type === 'shop') {
      searchConditions.push(
        prisma.shop.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { shop_keeper: { contains: query, mode: 'insensitive' } },
              { mobile: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 10
        }).then(shops => shops.map(s => ({ ...s, type: 'shop' })))
      );
    }
    
    // Build search conditions for factories
    if (!type || type === 'factory') {
      searchConditions.push(
        prisma.factory.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { manager: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: 10
        }).then(factories => factories.map(f => ({ ...f, type: 'factory' })))
      );
    }

    const results = await Promise.all(searchConditions);
    const allResults = results.flat();
    
    res.json(allResults);
  } catch (error) {
    console.error('Error searching entities:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
