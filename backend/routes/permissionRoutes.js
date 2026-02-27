const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all permissions
router.get('/', async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get single permission by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).json({ error: 'Failed to fetch permission' });
  }
});

// Create new permission
router.post('/', async (req, res) => {
  try {
    const { name, permissions } = req.body;

    // Validate input
    if (!name || !permissions) {
      return res.status(400).json({ error: 'Name and permissions are required' });
    }

    if (name === 'admin' || name == 'superadmin') {
      return res.status(400).json({ error: 'Cannot create admin permission' });
    }

    // Check if permission with same name exists
    const existingPermission = await prisma.permission.findUnique({
      where: { name }
    });

    if (existingPermission) {
      return res.status(400).json({ error: 'Permission with this name already exists' });
    }

    // Create new permission
    const permission = await prisma.permission.create({
      data: {
        name,
        permissions: Array.isArray(permissions) ? permissions : [permissions]
      },
      include: {
        users: true
      }
    });

    res.status(201).json(permission);
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

// Update permission
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Check if new name conflicts with other permissions
    if (name && name !== existingPermission.name) {
      const nameConflict = await prisma.permission.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return res.status(400).json({ error: 'Permission with this name already exists' });
      }
    }

    // Update permission
    const updatedPermission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingPermission.name,
        permissions: permissions ? (Array.isArray(permissions) ? permissions : [permissions]) : existingPermission.permissions
      },
      include: {
        users: true
      }
    });

    res.json(updatedPermission);
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Delete permission
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: true
      }
    });

    if (!existingPermission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Check if permission is assigned to any users
    if (existingPermission.users && existingPermission.users.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete permission assigned to users. Please remove assignment first.' 
      });
    }

    // Delete permission
    await prisma.permission.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

// Get users with specific permission
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    res.json(permission.users);
  } catch (error) {
    console.error('Error fetching permission users:', error);
    res.status(500).json({ error: 'Failed to fetch permission users' });
  }
});

module.exports = router;