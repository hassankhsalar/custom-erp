const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();



// Get all assignments with complete details
router.get('/all-assignments', async (req, res) => {
  try {
    const assignments = await prisma.userAssociate.findMany({
      include: {
        user: {
          select: {
  id: true,
  name: true,
  email: true,
  username: true,
  createdAt: true,
  permission: {
    select: {
      name: true,
      permissions: true
    }
  }
}
        }
      },
      orderBy: { id: 'desc' }
    });

    // Get all entities to map IDs to names
    const [stores, shops, factories, cashRegisters, accounts] = await Promise.all([
      prisma.store.findMany(),
      prisma.shop.findMany(),
      prisma.factory.findMany(),
      prisma.cashRegister.findMany(),
      prisma.accounts.findMany()
    ]);

    // Create lookup maps
    const entityMaps = {
      store: stores.reduce((map, store) => {
        map[store.id] = store;
        return map;
      }, {}),
      shop: shops.reduce((map, shop) => {
        map[shop.id] = shop;
        return map;
      }, {}),
      factory: factories.reduce((map, factory) => {
        map[factory.id] = factory;
        return map;
      }, {}),
      cashRegister: cashRegisters.reduce((map, cr) => {
        map[cr.id] = cr;
        return map;
      }, {}),
      account: accounts.reduce((map, account) => {
        map[account.id] = account;
        return map;
      }, {})
    };

    // Enhance assignments with entity details
    const enhancedAssignments = assignments.map(assignment => {
      const entityMap = entityMaps[assignment.associateName];
      const entity = entityMap ? entityMap[assignment.associateId] : null;
      
      return {
        ...assignment,
        entityName: entity?.name || `Unknown ${assignment.associateName}`,
        entityDetails: entity
      };
    });

    res.json(enhancedAssignments);
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignments by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const assignments = await prisma.userAssociate.findMany({
      where: {
        userId: parseInt(userId)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    // Get entity details
    const enhancedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let entity = null;
        
        switch (assignment.associateName) {
          case 'store':
            entity = await prisma.store.findUnique({ 
              where: { id: assignment.associateId } 
            });
            break;
          case 'shop':
            entity = await prisma.shop.findUnique({ 
              where: { id: assignment.associateId } 
            });
            break;
          case 'factory':
            entity = await prisma.factory.findUnique({ 
              where: { id: assignment.associateId } 
            });
            break;
          case 'cashRegister':
            entity = await prisma.cashRegister.findUnique({ 
              where: { id: assignment.associateId } 
            });
            break;
          case 'account':
            entity = await prisma.accounts.findUnique({ 
              where: { id: assignment.associateId } 
            });
            break;
        }

        return {
          ...assignment,
          entityName: entity?.name || `Unknown ${assignment.associateName}`,
          entityDetails: entity
        };
      })
    );

    res.json(enhancedAssignments);
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all entities (stores, shops, factories, cash registers, accounts)
router.get('/entities', async (req, res) => {
  try {
    const [stores, shops, factories, cashRegisters, accounts] = await Promise.all([
      prisma.store.findMany(),
      prisma.shop.findMany(),
      prisma.factory.findMany(),
      prisma.cashRegister.findMany(),
      prisma.accounts.findMany({ where: { status: 'active' } })
    ]);

    // Get all user assignments
    const assignments = await prisma.userAssociate.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            createdAt: true,
            permission: {
              select: {
                name: true,
                permissions: true
              }
            }
          }
        }
      }
    });

    // Combine all entities
    const entities = [
      ...stores.map(store => ({
        id: store.id,
        name: store.name,
        type: 'store',
        address: store.address,
        manager: store.store_keeper,
        mobile: store.mobile,
        assignedUsers: assignments.filter(a => 
          a.associateName === 'store' && a.associateId === store.id
        ).map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          username: a.user.username,
          // Use permission name as role
          role: a.user.permission?.name || 'default'
        }))
      })),
      ...shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        type: 'shop',
        address: shop.address,
        manager: shop.shop_keeper,
        mobile: shop.mobile,
        assignedUsers: assignments.filter(a => 
          a.associateName === 'shop' && a.associateId === shop.id
        ).map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          username: a.user.username,
          role: a.user.permission?.name || 'default'
        }))
      })),
      ...factories.map(factory => ({
        id: factory.id,
        name: factory.name,
        type: 'factory',
        address: factory.address,
        manager: factory.manager,
        mobile: factory.phone,
        email: factory.email,
        assignedUsers: assignments.filter(a => 
          a.associateName === 'factory' && a.associateId === factory.id
        ).map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          username: a.user.username,
          role: a.user.permission?.name || 'default'
        }))
      })),
      ...cashRegisters.map(cr => ({
        id: cr.id,
        name: cr.name,
        type: 'cashRegister',
        status: cr.status,
        cash_in_hand: cr.cash_in_hand,
        assignedUsers: assignments.filter(a => 
          a.associateName === 'cashRegister' && a.associateId === cr.id
        ).map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          username: a.user.username,
          role: a.user.permission?.name || 'default'
        }))
      })),
      ...accounts.map(account => ({
        id: account.id,
        name: account.name,
        type: 'account',
        account_number: account.account_number,
        balance: account.balance,
        status: account.status,
        assignedUsers: assignments.filter(a => 
          a.associateName === 'account' && a.associateId === account.id
        ).map(a => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          username: a.user.username,
          role: a.user.permission?.name || 'default'
        }))
      }))
    ];

    res.json(entities);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available users for assignment
router.get('/available-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        createdAt: true,
        permission: {
          select: {
            name: true,
            permissions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Format users with role from permission
    const formattedUsers = users.map(user => ({
      ...user,
      role: user.permission?.name || 'default'
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign user to entity
router.post('/assign', async (req, res) => {
  try {
    const { userId, associateName, associateId } = req.body;

    // Validate input
    if (!['store', 'shop', 'factory', 'cashRegister', 'account'].includes(associateName)) {
      return res.status(400).json({ error: 'Invalid associate name' });
    }

    if (!userId || !associateId) {
      return res.status(400).json({ error: 'User ID and Associate ID are required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if entity exists based on type
    let entityExists = false;
    let entityName = '';
    
    try {
      switch (associateName) {
        case 'store':
          const store = await prisma.store.findUnique({ 
            where: { id: parseInt(associateId) } 
          });
          entityExists = store !== null;
          entityName = store?.name || '';
          break;
          
        case 'shop':
          const shop = await prisma.shop.findUnique({ 
            where: { id: parseInt(associateId) } 
          });
          entityExists = shop !== null;
          entityName = shop?.name || '';
          break;
          
        case 'factory':
          const factory = await prisma.factory.findUnique({ 
            where: { id: parseInt(associateId) } 
          });
          entityExists = factory !== null;
          entityName = factory?.name || '';
          break;
          
        case 'cashRegister':
          const cashRegister = await prisma.cashRegister.findUnique({ 
            where: { id: parseInt(associateId) } 
          });
          entityExists = cashRegister !== null;
          entityName = cashRegister?.name || '';
          break;
          
        case 'account':
          const account = await prisma.accounts.findUnique({ 
            where: { id: parseInt(associateId) } 
          });
          entityExists = account !== null;
          entityName = account?.name || '';
          break;
      }
    } catch (error) {
      return res.status(404).json({ error: `${associateName} not found` });
    }

    if (!entityExists) {
      return res.status(404).json({ error: `${associateName} not found` });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userAssociate.findFirst({
      where: {
        userId: parseInt(userId),
        associateName,
        associateId: parseInt(associateId)
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'User already assigned to this entity' });
    }

    // Create the assignment
const assignment = await prisma.userAssociate.create({
  data: {
    userId: parseInt(userId),
    associateName,
    associateId: parseInt(associateId)
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        permission: {
          select: {
            name: true,
            permissions: true
          }
        }
      }
    }
  }
});

// Format the response with role
const formattedAssignment = {
  ...assignment,
  user: {
    ...assignment.user,
    role: assignment.user.permission?.name || 'default'
  }
};

    return res.status(201).json(formattedAssignment);
  } catch (error) {
    console.error('Error assigning user:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user assignments for an entity
router.get('/entity/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['store', 'shop', 'factory', 'cashRegister', 'account'].includes(type)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const assignments = await prisma.userAssociate.findMany({
      where: {
        associateName: type,
        associateId: parseInt(id)
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            createdAt: true,
            permission: {
              select: {
                name: true,
                permissions: true
              }
            }
          }
        }
      }
    });

    // Format assignments with role
    const formattedAssignments = assignments.map(assignment => ({
      ...assignment,
      user: {
        ...assignment.user,
        role: assignment.user.permission?.name || 'default'
      }
    }));

    res.json(formattedAssignments);
  } catch (error) {
    console.error('Error fetching entity assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove user assignment
router.delete('/assignment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.userAssociate.findUnique({
      where: { id: parseInt(id) }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.userAssociate.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'User assignment removed successfully' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get entity details
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
      case 'cashRegister':
        entity = await prisma.cashRegister.findUnique({ where: { id: parseInt(id) } });
        break;
      case 'account':
        entity = await prisma.accounts.findUnique({ where: { id: parseInt(id) } });
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

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalEntities,
      totalAssignments,
      assignmentsByType
    ] = await Promise.all([
      prisma.user.count(),
      prisma.$queryRaw`SELECT COUNT(*) as count FROM (
        SELECT id FROM Store 
        UNION SELECT id FROM Shop 
        UNION SELECT id FROM Factory 
        UNION SELECT id FROM CashRegister 
        UNION SELECT id FROM Accounts WHERE status = 'active'
      ) as entities`,
      prisma.userAssociate.count(),
      prisma.userAssociate.groupBy({
        by: ['associateName'],
        _count: true
      })
    ]);

    res.json({
      totalUsers,
      totalEntities: Number(totalEntities[0].count),
      totalAssignments,
      assignmentsByType: assignmentsByType.reduce((acc, item) => {
        acc[item.associateName] = item._count;
        return acc;
      }, {}),
      assignmentPercentage: totalUsers > 0 ? 
        Math.round((totalAssignments / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
