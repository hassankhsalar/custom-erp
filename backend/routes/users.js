const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, password, role, permissions } = req.body;

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
    const validRoles = ['USER', 'ADMIN', 'USER_ASSOCIATE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
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
        permissions: permissions || {
          dashboard: ['read'],
          profile: ['read', 'write'],
          sale: ['read'],
          shop: ['read'],
          materials: ['read'],
          production: ['read'],
          purchase: ['read'],
          factory: ['read'],
          stores: ['read'],
          report: ['read']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
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
        }
      },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;