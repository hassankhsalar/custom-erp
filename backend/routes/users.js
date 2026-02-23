const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const router = express.Router();
const cache = require('../cachingService');

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeTimeValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !TIME_24H_REGEX.test(value)) return "__invalid__";
  return value;
};

const getCurrentUserWithPermission = async (userId) => {
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    include: {
      permission: {
        select: {
          name: true,
          permissions: true,
        },
      },
    },
  });
};

const canManageUserSessions = (user) => {
  if (!user || !user.permission) return false;
  if (user.permission.name === "admin" || user.permission.name === "superadmin") return true;
  const perms = Array.isArray(user.permission.permissions) ? user.permission.permissions : [];
  return perms.includes("user_logout");
};

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, username, name, password, permissionId } = req.body;

    // Validate required fields
    if (!email || !username || !name || !password) {
      return res.status(400).json({ error: "Email, username, name, and password are required" });
    }

    // Check if user already exists with email
    const existingUserEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUserEmail) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Check if user already exists with username
    const existingUserUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUserUsername) {
      return res.status(400).json({ error: "User with this username already exists" });
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
        username,
        name,
        password: hashedPassword,
        permissionId: permissionId ? parseInt(permissionId) : null
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
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
    const { name, email, username, permissionId, loginStartTime, loginEndTime } = req.body;

    // Validate required fields
    if (!name || !email || !username) {
      return res.status(400).json({ error: "Name, email, and username are required" });
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

    // Check if username already exists for other users
    const usernameConflict = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: parseInt(id) }
      }
    });

    if (usernameConflict) {
      return res.status(400).json({ error: "Username already exists" });
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

    const normalizedStartTime = normalizeTimeValue(loginStartTime);
    const normalizedEndTime = normalizeTimeValue(loginEndTime);
    if (normalizedStartTime === "__invalid__" || normalizedEndTime === "__invalid__") {
      return res.status(400).json({ error: "Invalid time format. Use HH:mm" });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        username,
        permissionId: permissionId !== undefined ? (permissionId ? parseInt(permissionId) : null) : existingUser.permissionId,
        loginStartTime: normalizedStartTime !== null || loginStartTime === null || loginStartTime === "" ? normalizedStartTime : existingUser.loginStartTime,
        loginEndTime: normalizedEndTime !== null || loginEndTime === null || loginEndTime === "" ? normalizedEndTime : existingUser.loginEndTime,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        createdAt: true,
        updatedAt: true
      }
    });

    cache.del(`user_${id}`);

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
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
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
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return next();
    }
    const cacheKey = `user_${id}`;

    const cachedUser = cache.get(cacheKey);
    if (cachedUser) {
      return res.json(cachedUser);
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    cache.set(cacheKey, user);
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

    cache.del(`user_${id}`);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
});

// Get user by username
router.get("/username/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        permission: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        },
        profile: true,
        loginStartTime: true,
        loginEndTime: true,
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
        username: true,
        name: true,
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
      username: user.username,
      permissionName: user.permission?.name,
      permissions: permissions
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({ error: "Failed to fetch user permissions" });
  }
});

// Get currently active users (real-time presence data)
router.get("/active-sessions", async (req, res) => {
  try {
    const currentUser = await getCurrentUserWithPermission(req.user?.userId);
    if (!canManageUserSessions(currentUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sessionTracker = req.app.get("sessionTracker");
    if (!sessionTracker) {
      return res.status(500).json({ error: "Session tracker is not initialized" });
    }

    res.json(sessionTracker.getActiveUsers());
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

// Force logout a user immediately
router.post("/:id/force-logout", async (req, res) => {
  try {
    const currentUser = await getCurrentUserWithPermission(req.user?.userId);
    if (!canManageUserSessions(currentUser)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, sessionVersion: true, username: true },
    });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        sessionVersion: (targetUser.sessionVersion || 0) + 1,
      },
    });

    const sessionTracker = req.app.get("sessionTracker");
    if (sessionTracker) {
      await sessionTracker.forceLogoutUser(
        targetUserId,
        "You have been logged out by an administrator."
      );
    }

    res.json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error forcing user logout:", error);
    res.status(500).json({ error: "Failed to force logout user" });
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
        username: true,
        name: true,
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
    if (user.permission && user.permission.name === 'admin') {
      return res.json({ 
        hasPermission: true, 
        isAdmin: true,
        userId: user.id,
        username: user.username
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
      username: user.username,
      permissionName: user.permission?.name
    });
  } catch (error) {
    console.error("Error checking permission:", error);
    res.status(500).json({ error: "Failed to check permission" });
  }
});

module.exports = router;
