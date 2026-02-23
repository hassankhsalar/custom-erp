const express = require('express');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');
const { activityLoggerMiddleware, logActivity } = require('./utils/activityLogger');
const { createSessionTracker, isWithinAllowedLoginWindow, LOGIN_WINDOW_ERROR } = require('./services/realtimeTracker');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
app.use(activityLoggerMiddleware);

const JWT_SECRET = 'your-secret-key';

// Middleware to protect routes
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Token is required' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    const tokenSessionVersion = typeof user.sessionVersion === 'number' ? user.sessionVersion : 0;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        sessionVersion: true,
        loginStartTime: true,
        loginEndTime: true,
      },
    });

    if (!dbUser) return res.status(401).json({ error: 'Invalid user session' });
    if ((dbUser.sessionVersion || 0) !== tokenSessionVersion) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    if (!isWithinAllowedLoginWindow(dbUser)) {
      return res.status(403).json({ error: LOGIN_WINDOW_ERROR });
    }

    req.user = {
      ...user,
      userId: dbUser.id,
      sessionVersion: dbUser.sessionVersion || 0,
    };
    next();
  } catch (_) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const hasPermission = (permission) => {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { permission: true },
    });

    if (!user || !user.permission) {
      return res.status(403).json({ error: 'Forbidden: No permission record found for user' });
    }

    if (user.permission.name === 'admin' || user.permission.name === 'superadmin') {
      return next();
    }

    const userPermissions = user.permission.permissions;

    if (!userPermissions || !userPermissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

// Register a new user
app.post('/api/register', authenticateToken, hasPermission('create_user'), async (req, res) => {
  const { email, password, name, username } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const defaultPermission = await prisma.permission.findUnique({
      where: { name: 'default' },
    });

    if (!defaultPermission) {
      return res.status(500).json({ error: 'Default permission not found.' });
    }

    const existingUserEmail = await prisma.user.findUnique({ where: { email } });
    if (existingUserEmail) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingUserUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUserUsername) {
        return res.status(400).json({ error: 'User with this username already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        permissionId: defaultPermission.id,
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: 'Failed to register user: ' + error.message });
  }
});

// Login a user
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;
  let user = await prisma.user.findUnique({ where: { username: identifier } });

  if (user == null) {
    user = await prisma.user.findUnique({ where: { email: identifier } });
  }

  if (user == null) {
    return res.status(400).json({ error: 'Cannot find user' });
  }

  if (!isWithinAllowedLoginWindow(user)) {
    return res.status(403).json({ error: LOGIN_WINDOW_ERROR });
  }

  if (await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign({ userId: user.id, sessionVersion: user.sessionVersion || 0 }, JWT_SECRET);
    await logActivity({
      userId: user.id,
      module: 'auth',
      action: 'login',
      description: 'User logged in',
      status: 'success',
      metadata: { identifier },
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });
    res.json({ accessToken, username: user.username, name: user.name, email: user.email });
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
const productRoutes = require('./routes/productRoutes');
const factoryRoutes = require('./routes/factoryRoutes');
const productionRoutes = require('./routes/productionRoutes');
const storeRoutes = require('./routes/storeRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const salesRoutes = require('./routes/salesRoutes');
const shopRoutes = require('./routes/shopRoutes');
const shopSalesRoutes = require('./routes/shop-sales');
const customerRoutes = require('./routes/customerRoutes');
// const storeToShopTransfersRoutes = require('./routes/store-to-shop-transfers');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const transferRoutes = require('./routes/transferRoutes');
const scrapRoutes = require('./routes/scrapRoutes');
const scrapProductsRoutes = require('./routes/scrapProductsRoutes');
const productRepairsRoutes = require('./routes/productRepairsRoutes');
const materialRepairsRoutes = require('./routes/materialRepairsRoutes');
const scrapMaterialsRoutes = require('./routes/scrapMaterialsRoutes');
const branchMaterialRoutes = require('./routes/branchMaterialRoutes');
const materialScrapRoutes = require('./routes/materialScrapRoutes');
const accountRoutes = require('./routes/accountRoutes');
const assignAccountRoutes = require('./routes/assignAccountRoutes');
const cashRegisterAssignRoutes = require('./routes/cashRegisterAssignRoutes');
const cashRegisterRoutes = require('./routes/cashRegisterRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const generalLedgerRoutes = require('./routes/generalLedgerRoutes');
const balanceSheetRoutes = require('./routes/balanceSheetRoutes');
const assignUserRoutes = require('./routes/assignUserRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const userPermissionRoutes = require('./routes/userPermissionRoutes');
const hrmRoutes = require('./routes/hrmRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const reportExtraRoutes = require('./routes/reportExtraRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const { startSalaryCron } = require('./services/salaryCron');
const { testCron } = require('./services/testCron');
const { startDailyStockCron } = require('./services/dailyStockCron');
const dailyStockReportRoutes = require('./routes/dailyStockReportRoutes');
const requisitionRoutes = require('./routes/requisitionRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');
const businessSettingsRoutes = require('./routes/businessSettingsRoutes');

const uploadRoutes = require('./routes/uploadRoutes');



app.use('/api/materials', authenticateToken, materialRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/factories', authenticateToken, factoryRoutes);
app.use('/api/productions', authenticateToken, productionRoutes);
app.use('/api/stores', authenticateToken, storeRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/purchases', authenticateToken, purchaseRoutes);
app.use('/api/sales', authenticateToken, salesRoutes);
app.use('/api/shops', authenticateToken, shopRoutes);
app.use('/api/shop-sales', authenticateToken, shopSalesRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
// app.use('/api/store-to-shop-transfers', storeToShopTransfersRoutes);
app.use('/api/dash-board', dashboardRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/transfers', authenticateToken, transferRoutes);
app.use('/api/scrap-records', authenticateToken, scrapRoutes);
app.use('/api/scrap-products', authenticateToken, scrapProductsRoutes);
app.use('/api/product-repairs', authenticateToken, productRepairsRoutes);
app.use('/api/material-repairs', authenticateToken, materialRepairsRoutes);
app.use('/api/scrap-materials', authenticateToken, scrapMaterialsRoutes);
app.use('/api/branch-materials', authenticateToken, branchMaterialRoutes);
app.use('/api/materials-scrap-records', authenticateToken, materialScrapRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/accounts', authenticateToken, accountRoutes);
app.use('/api/assign-account', authenticateToken, assignAccountRoutes);
app.use('/api/cash-register-assign', authenticateToken, cashRegisterAssignRoutes);
app.use('/api/cash-registers', authenticateToken, cashRegisterRoutes);
app.use('/api/bank-accounts', authenticateToken, bankAccountRoutes);
app.use('/api/general-ledger', authenticateToken, generalLedgerRoutes);
app.use('/api/balance-sheet', authenticateToken, balanceSheetRoutes);
app.use('/api/assign-user', authenticateToken, assignUserRoutes);
app.use('/api/permissions', authenticateToken, permissionRoutes);
app.use('/api/user-management', authenticateToken, userPermissionRoutes);
app.use('/api/hrm', authenticateToken, hrmRoutes);
app.use('/api/expenses', authenticateToken, expenseRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/reports', authenticateToken, reportExtraRoutes);
app.use('/api/reports', authenticateToken, dailyStockReportRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/activity-logs', authenticateToken, activityLogRoutes);
app.use('/api/requisitions', authenticateToken, requisitionRoutes);
app.use('/api/master-data', authenticateToken, masterDataRoutes);
app.use('/api/business-settings', authenticateToken, businessSettingsRoutes);

// serve static files from uploads directory
app.use('/uploads', express.static('uploads'));


const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const sessionTracker = createSessionTracker({
  io,
  prisma,
  jwtSecret: JWT_SECRET,
});

app.set('io', io);
app.set('sessionTracker', sessionTracker);

const port = 3001;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

startSalaryCron();
startDailyStockCron();
// testCron();


module.exports = {
  authenticateToken,
  hasPermission,
  JWT_SECRET
};
