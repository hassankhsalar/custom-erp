const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, password, role } = req.body;

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with empty permissions
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        permissions: {} // Empty object by default
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true
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
    const { name, email, role, permissions } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if email already exists for other users
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: parseInt(id) }
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Validate role
    const validRoles = ['USER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Validate permissions structure if provided
    if (permissions && typeof permissions === 'object') {
      // Validate locations array structure
      if (permissions.locations && Array.isArray(permissions.locations)) {
        for (const location of permissions.locations) {
          if (!location.type || !location.id || !location.name) {
            return res.status(400).json({ 
              error: "Each location must have type, id, and name" 
            });
          }

          if (!['factory', 'store', 'shop'].includes(location.type)) {
            return res.status(400).json({ 
              error: "Location type must be factory, store, or shop" 
            });
          }

          if (!location.permissions || typeof location.permissions !== 'object') {
            return res.status(400).json({ 
              error: "Each location must have permissions object" 
            });
          }

          // Ensure all CRUD permissions are boolean
          const validPermissions = ['create', 'read', 'update', 'delete'];
          for (const perm of validPermissions) {
            if (typeof location.permissions[perm] !== 'boolean') {
              location.permissions[perm] = false;
            }
          }
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
        permissions: permissions || { locations: [] }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        profile: {
          select: {
            id: true,
            bio: true
          }
        }
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
        permissions: true,
        profile: {
          select: {
            id: true,
            bio: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
    });

    res.json(users);
  } catch (err) {
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
        permissions: true,
        profile: {
          select: {
            id: true,
            bio: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
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

// Get users by location type and ID
router.get("/location/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const locationId = parseInt(id);

    if (!['factory', 'store', 'shop'].includes(type)) {
      return res.status(400).json({ error: "Invalid location type" });
    }

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
      }
    });

    // Filter users who have this location in their permissions
    const users = allUsers.filter(user => {
      if (!user.permissions || typeof user.permissions !== 'object') {
        return false;
      }
      
      return Object.values(user.permissions).some(location => 
        location.type === type && location.id === locationId
      );
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        permissions: true,
        profile: {
          select: {
            id: true,
            bio: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;