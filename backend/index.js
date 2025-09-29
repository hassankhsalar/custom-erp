const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your-secret-key'; // Replace with a strong secret key

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const hasPermission = (permission) => {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (user.role === 'ADMIN') {
      return next();
    }

    if (!user.permissions || !user.permissions[permission]) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

// Register a new user
app.post('/api/register', async (req, res) => {
  const { email, password, name, role, permissions } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'USER',
        permissions: permissions || {},
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// Login a user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user == null) {
    return res.status(400).json({ error: 'Cannot find user' });
  }

  if (await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({ accessToken });
  } else {
    res.status(401).json({ error: 'Not Allowed' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { profile: true },
  });
  res.json(user);
});

// Update user profile
app.put('/api/profile', authenticateToken, hasPermission('profile'), async (req, res) => {
  const { bio } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      profile: {
        upsert: {
          create: { bio },
          update: { bio },
        },
      },
    },
    include: { profile: true },
  });
  res.json(user);
});

app.get('/api/admin', authenticateToken, hasPermission('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin panel' });
});

app.get('/api/dashboard', authenticateToken, hasPermission('dashboard'), (req, res) => {
  res.json({ message: 'Welcome to the dashboard' });
});

const materialRoutes = require('./routes/materialRoutes');

app.use('/api/materials', materialRoutes);

const port = 3001;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});