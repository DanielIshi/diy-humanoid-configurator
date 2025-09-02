import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authRateLimiter); // Stricter rate limiting for admin
router.use(protect); // Require authentication
router.use(requireAdmin); // Require admin role

// Admin dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Mock dashboard data (replace with real database queries)
  const stats = {
    totalOrders: 142,
    totalRevenue: 89750.50,
    activeConfigurations: 67,
    popularComponents: [
      { name: 'Standard Torso', orders: 45 },
      { name: 'Basic Head Unit', orders: 38 },
      { name: 'Articulated Arms', orders: 34 }
    ],
    recentActivity: [
      { type: 'order', message: 'New order #1043 - $1,299.98', timestamp: '2024-01-15T14:30:00Z' },
      { type: 'config', message: 'Configuration saved: Advanced Walker', timestamp: '2024-01-15T14:25:00Z' },
      { type: 'payment', message: 'Payment completed for order #1042', timestamp: '2024-01-15T14:20:00Z' }
    ]
  };

  logger.info('Admin dashboard accessed', { userId: req.user.id });

  res.json({
    success: true,
    data: { stats }
  });
}));

// Manage orders
router.get('/orders', asyncHandler(async (req, res) => {
  // Mock order management data
  const orders = [
    {
      id: 'order-1043',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      total: 1299.98,
      status: 'pending',
      createdAt: '2024-01-15T14:30:00Z',
      items: [
        { name: 'Basic Head Unit', quantity: 1, price: 299.99 },
        { name: 'Standard Torso', quantity: 1, price: 599.99 },
        { name: 'Articulated Arms', quantity: 1, price: 399.99 }
      ]
    }
  ];

  res.json({
    success: true,
    data: { orders }
  });
}));

// Update order status
router.patch('/orders/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid status' }
    });
  }

  // Mock update (replace with database update)
  logger.info('Order status updated', {
    orderId: id,
    newStatus: status,
    adminUserId: req.user.id,
    notes
  });

  res.json({
    success: true,
    data: { 
      message: 'Order status updated successfully',
      orderId: id,
      status
    }
  });
}));

// System configuration
router.get('/config/system', asyncHandler(async (req, res) => {
  const systemConfig = {
    maintenance: false,
    paymentProviders: {
      stripe: { enabled: true, status: 'connected' },
      paypal: { enabled: true, status: 'connected' }
    },
    aiServices: {
      openai: { enabled: true, status: 'connected' },
      openrouter: { enabled: false, status: 'disconnected' }
    },
    features: {
      configurator: { enabled: true },
      aiAssistant: { enabled: true },
      realTimePreview: { enabled: false }
    }
  };

  res.json({
    success: true,
    data: { config: systemConfig }
  });
}));

// Update system configuration
router.put('/config/system', asyncHandler(async (req, res) => {
  const { config } = req.body;

  // Validate and update system configuration
  logger.info('System configuration updated', {
    adminUserId: req.user.id,
    changes: config
  });

  res.json({
    success: true,
    data: { message: 'System configuration updated successfully' }
  });
}));

// Product management
router.get('/products', asyncHandler(async (req, res) => {
  // This would typically fetch from database with admin-specific fields
  res.json({
    success: true,
    data: {
      message: 'Product management endpoint - implement database integration'
    }
  });
}));

// Analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;

  // Mock analytics data
  const analytics = {
    period,
    metrics: {
      revenue: {
        current: 12450.75,
        previous: 9880.25,
        change: '+26.0%'
      },
      orders: {
        current: 23,
        previous: 18,
        change: '+27.8%'
      },
      conversionRate: {
        current: 3.2,
        previous: 2.8,
        change: '+14.3%'
      }
    },
    charts: {
      dailyRevenue: [
        { date: '2024-01-08', revenue: 1250.00 },
        { date: '2024-01-09', revenue: 1890.50 },
        { date: '2024-01-10', revenue: 2150.25 }
      ]
    }
  };

  res.json({
    success: true,
    data: { analytics }
  });
}));

export default router;