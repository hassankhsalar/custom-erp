// backend/routes/HomePage/orderRoutes.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new order
router.post('/', async (req, res) => {
  try {
    const {
      items,
      total,
      orderType,
      outletId,
      deliveryAddress,
      customerName,
      customerEmail,
      customerMobile,
      notes,
      status = 'pending'
    } = req.body;

    console.log('Creating order with data:', req.body);

    // Validate required fields
    if (!total) {
      return res.status(400).json({ error: 'Total amount is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    if (!customerName || !customerMobile) {
      return res.status(400).json({ error: 'Customer name and mobile are required' });
    }

    if (orderType === 'pickup' && !outletId) {
      return res.status(400).json({ error: 'Outlet ID is required for pickup orders' });
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
    }

    // Generate a unique order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        total: parseFloat(total),
        orderType,
        ...(outletId && { outletId: parseInt(outletId) }),
        deliveryAddress,
        customerName,
        customerEmail,
        customerMobile,
        notes,
        status,
        items: {
          create: items.map(item => ({
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            productName: item.productName,
            total: parseFloat(item.price) * parseInt(item.quantity)
          }))
        }
      },
      include: {
        items: true,
        outlet: true
      }
    });

    console.log('Order created successfully:', order.id);
    res.status(201).json(order);
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID - FIXED: Parse id to integer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    // Check if id is valid
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }, // Now using parsed integer
      include: {
        items: true,
        outlet: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      paymentStatus,
      orderType,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortDir = 'desc'
    } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const take = Math.max(1, parseInt(limit) || 20);
    const skip = (pageNum - 1) * take;

    // Build where clause
    const where = {};
    
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (orderType) where.orderType = orderType;
    
    // Search functionality
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerMobile: { contains: search } }
      ];
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Validate sortBy to prevent injection
    const allowedSortFields = ['createdAt', 'total', 'status', 'customerName', 'orderType'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortDir === 'asc' ? 'asc' : 'desc';

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        skip,
        take,
        where,
        orderBy: { [orderField]: orderDirection },
        include: {
          items: true,
          outlet: true
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      orders,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders overview stats
router.get('/overview', async (req, res) => {
  try {
    const [totalOrders, pendingOrders, completedOrders, revenue] = await prisma.$transaction([
      prisma.order.count({ where: { deletedAt: false } }),
      prisma.order.count({ where: { status: 'pending', deletedAt: false } }),
      prisma.order.count({ where: { status: 'completed', deletedAt: false } }),
      prisma.order.aggregate({
        where: { deletedAt: false },
        _sum: { total: true }
      })
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: revenue._sum.total || 0
    });
  } catch (error) {
    console.error('Error fetching order overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status with optional stock deduction
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deductStock } = req.body;
    
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Get the current order
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If status is being changed to 'completed' and deductStock is true
    if (status === 'completed' && deductStock && currentOrder.status !== 'completed') {
      // Use transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status },
          include: { items: true, outlet: true }
        });

        // Deduct stock for each item
        for (const item of currentOrder.items) {
          if (item.productId) {
            // Get current product
            const product = await tx.product.findUnique({
              where: { id: item.productId }
            });

            if (!product) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }

            // Check if enough stock is available
            if (product.stock < item.quantity) {
              throw new Error(`Insufficient stock for product: ${item.productName}. Available: ${product.stock}, Required: ${item.quantity}`);
            }

            // Deduct stock directly from product table
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            });

            // StockAdjustment creation removed - we're just updating product stock directly
          }
        }

        return updatedOrder;
      });

      res.json(result);
    } else {
      // Just update status without stock deduction
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true, outlet: true }
      });
      res.json(order);
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update payment status
router.patch('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
      include: { items: true, outlet: true }
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders by phone number
router.get('/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    const orders = await prisma.order.findMany({
      where: {
        customerMobile: {
          contains: phone
        },
        deletedAt: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        items: true,
        outlet: true
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders by phone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track order by ID or order number
router.get('/track', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Try to find by ID (if numeric)
    const id = parseInt(q);
    let order = null;

    if (!isNaN(id)) {
      order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          outlet: true
        }
      });
    }

    // If not found by ID, try by order number
    if (!order) {
      order = await prisma.order.findFirst({
        where: {
          orderNumber: q
        },
        include: {
          items: true,
          outlet: true
        }
      });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;