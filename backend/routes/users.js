const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, password, role, permissionId } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, name, and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if permission exists if provided
    if (permissionId) {
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });
      
      if (!permission) {
        return res.status(400).json({ error: "Permission not found" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        permissionId: permissionId ? parseInt(permissionId) : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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

    res.status(201).json({
      message: "User created successfully",
      user
    });

  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user: " + err.message });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, permissionId } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email already exists for other users
    const emailConflict = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: parseInt(id) }
      }
    });

    if (emailConflict) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if permission exists if provided
    if (permissionId !== undefined) {
      if (permissionId === null) {
        // Allow null to remove permission
      } else {
        const permission = await prisma.permission.findUnique({
          where: { id: parseInt(permissionId) }
        });
        
        if (!permission) {
          return res.status(400).json({ error: "Permission not found" });
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        role,
        permissionId: permissionId !== undefined ? (permissionId ? parseInt(permissionId) : null) : existingUser.permissionId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (err) {
    console.error("Update user error:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(500).json({ error: "Failed to update user: " + err.message });
  }
});

// Get all users (for user management page)
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
});

// Get user by email
router.get("/email/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by email error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Assign/update permission for a user
router.put("/:userId/permission", async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissionId } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If permissionId is provided, check if permission exists
    if (permissionId !== undefined && permissionId !== null) {
      const permission = await prisma.permission.findUnique({
        where: { id: parseInt(permissionId) }
      });

      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
    }

    // Update user's permission
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        permissionId: permissionId === null ? null : parseInt(permissionId)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
    console.error("Error updating user permission:", error);
    res.status(500).json({ error: "Failed to update user permission" });
  }
});

// Get user's permissions
router.get("/:userId/permissions", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        role: true,
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
      return res.status(404).json({ error: "User not found" });
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
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ error: "Failed to fetch user permissions" });
  }
});

// Check if user has specific permission
router.get("/:userId/has-permission/:permission", async (req, res) => {
  try {
    const { userId, permission } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        role: true,
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
      return res.status(404).json({ error: "User not found" });
    }

    // Admin users have all permissions
    if (user.role === 'ADMIN') {
      return res.json({ 
        hasPermission: true, 
        isAdmin: true,
        userId: user.id,
        userName: user.name
      });
    }

    // Check if user has permission
    const userPermissions = user.permission?.permissions || [];
    const hasPermission = Array.isArray(userPermissions) 
      ? userPermissions.includes(permission)
      : false;

    res.json({ 
      hasPermission,
      isAdmin: false,
      userId: user.id,
      userName: user.name,
      permissionName: user.permission?.name
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

module.exports = router;