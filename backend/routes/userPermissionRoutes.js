const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all users with their permissions
router.get('/',  async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deleted_at: false },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Assign/update permission for a user
router.put('/:userId/permission',  async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionId } = req.body;

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If permissionId is provided, check if permission exists
    if (permissionId !== undefined && permissionId !== null) {
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }
    }

    // Update user's permission
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        permissionId: permissionId === null ? null : parseInt(permissionId)
      },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user permission:', error);
    res.status(500).json({ error: 'Failed to update user permission' });
  }
});

// Get user's permissions
router.get('/:userId/permissions',  async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return permissions array or empty array
    const permissions = user.permission?.permissions || [];
    res.json({ 
      userId: user.id,
      userName: user.name,
      permissionName: user.permission?.name,
      permissions: permissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// Check if user has specific permission
router.get('/:userId/has-permission/:permission',  async (req, res) => {
  try {
    const { userId, permission } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId), deleted_at: false },
      include: {
        permission: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admin users have all permissions
    if (user.role === 'ADMIN') {
      return res.json({ hasPermission: true, isAdmin: true });
    }

    // Check if user has permission
    const userPermissions = user.permission?.permissions || [];
    const hasPermission = Array.isArray(userPermissions) 
      ? userPermissions.includes(permission)
      : false;

    res.json({ 
      hasPermission,
      isAdmin: false,
      permissionName: user.permission?.name
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

module.exports = router;
