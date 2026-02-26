const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all entities (stores, shops, factories) with their assigned accounts
router.get('/entities', async (req, res) => {
  try {
    // Get all stores, shops, and factories
    const [stores, shops, factories, assignments] = await Promise.all([
      prisma.store.findMany({ where: { deleted_at: false } }),
      prisma.shop.findMany({ where: { deleted_at: false } }),
      prisma.factory.findMany({ where: { deleted_at: false } }),
      prisma.entityAccount.findMany({
        where: { account: { deleted_at: false } },
        include: {
          account: true,
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
        assignedAccounts: assignments.filter(a => 
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
        assignedAccounts: assignments.filter(a => 
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
        assignedAccounts: assignments.filter(a => 
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

// Get accounts available for assignment
router.get('/available-accounts', async (req, res) => {
  try {
    const accounts = await prisma.accounts.findMany({
      where: {
        status: 'active',
        deleted_at: false,
      },
      orderBy: { name: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign account to entity
router.post('/assign', async (req, res) => {
  try {
    const { entityType, entityId, accountId, isPrimary, assignedById } = req.body;

    // Validate input
    if (!['store', 'shop', 'factory'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type. Must be store, shop, or factory' });
    }

    if (!entityId || !accountId) {
      return res.status(400).json({ error: 'Entity ID and Account ID are required' });
    }

    // Check if account exists
    const account = await prisma.accounts.findFirst({
      where: { id: parseInt(accountId), deleted_at: false }
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
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

    // Check if assignment already exists
    const existingAssignment = await prisma.entityAccount.findFirst({
      where: {
        entityType,
        entityId: parseInt(entityId),
        accountId: parseInt(accountId)
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Account already assigned to this entity' });
    }

    // If this is to be primary, unset any existing primary account for this entity
    if (isPrimary) {
      await prisma.entityAccount.updateMany({
        where: {
          entityType,
          entityId: parseInt(entityId),
          isPrimary: true
        },
        data: { isPrimary: false }
      });
    }

    // Prepare assignment data
    const assignmentData = {
      entityType,
      entityId: parseInt(entityId),
      accountId: parseInt(accountId),
      isPrimary: Boolean(isPrimary),
      assignedAt: new Date()
    };

    // Add assignedBy if provided
    if (assignedById) {
      assignmentData.assignedById = parseInt(assignedById);
    }

    // Create the assignment
    const assignment = await prisma.entityAccount.create({
      data: assignmentData,
      include: {
        account: true,
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
    console.error('Error assigning account:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get account assignments for an entity
router.get('/entity/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['store', 'shop', 'factory'].includes(type)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const assignments = await prisma.entityAccount.findMany({
      where: {
        entityType: type,
        entityId: parseInt(id)
      },
      include: {
        account: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { assignedAt: 'desc' }
      ]
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching entity assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove account assignment
router.delete('/assignment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.entityAccount.findUnique({
      where: { id: parseInt(id) }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.entityAccount.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Account assignment removed successfully' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Set primary account
router.put('/set-primary/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.entityAccount.findUnique({
      where: { id: parseInt(id) },
      include: { account: true }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Unset any existing primary account for this entity
    await prisma.entityAccount.updateMany({
      where: {
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        isPrimary: true
      },
      data: { isPrimary: false }
    });

    // Set this as primary
    const updated = await prisma.entityAccount.update({
      where: { id: parseInt(id) },
      data: { isPrimary: true },
      include: { 
        account: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error setting primary account:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get entity details (store, shop, or factory)
router.get('/entity-details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    let entity = null;
    switch (type) {
      case 'store':
        entity = await prisma.store.findUnique({ where: { id: parseInt(id) } });
        break;
      case 'shop':
        entity = await prisma.shop.findUnique({ where: { id: parseInt(id) } });
        break;
      case 'factory':
        entity = await prisma.factory.findUnique({ where: { id: parseInt(id) } });
        break;
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (!entity) {
      return res.status(404).json({ error: `${type} not found` });
    }

    res.json(entity);
  } catch (error) {
    console.error('Error fetching entity details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
