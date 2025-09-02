import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { protect, requireAdmin, requireVerifiedEmail } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { auditAdmin, getAuditLogs } from '../middleware/audit.js';
import { authService } from '../services/authService.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authRateLimiter); // Stricter rate limiting for admin
router.use(protect); // Require authentication
router.use(requireVerifiedEmail); // Require verified email
router.use(requireAdmin); // Require admin role
router.use(auditAdmin); // Audit all admin actions

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

// User Management
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  
  const where = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (role) {
    where.role = role.toUpperCase();
  }

  // This would be implemented with actual Prisma queries
  const mockUsers = [
    {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date()
    },
    {
      id: 'user-2',
      email: 'customer@example.com',
      name: 'Customer User',
      role: 'CUSTOMER',
      emailVerified: true,
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date()
    }
  ];

  logger.info('Admin accessed user list', { 
    adminId: req.user.id,
    page,
    limit,
    search: search || 'none'
  });

  res.json({
    success: true,
    data: {
      users: mockUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockUsers.length,
        pages: 1
      }
    }
  });
}));

// Update user role
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['CUSTOMER', 'SUPPORT', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid role' }
    });
  }

  // Prevent self-demotion from admin
  if (id === req.user.id && role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { message: 'Cannot change your own admin role' }
    });
  }

  logger.warn('User role changed by admin', {
    adminId: req.user.id,
    targetUserId: id,
    newRole: role
  });

  res.json({
    success: true,
    data: { message: 'User role updated successfully' }
  });
}));

// Deactivate/Activate user
router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  // Prevent self-deactivation
  if (id === req.user.id) {
    return res.status(403).json({
      success: false,
      error: { message: 'Cannot deactivate your own account' }
    });
  }

  logger.warn('User status changed by admin', {
    adminId: req.user.id,
    targetUserId: id,
    newStatus: isActive ? 'active' : 'inactive'
  });

  res.json({
    success: true,
    data: { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` }
  });
}));

// Audit Logs
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    entity,
    startDate,
    endDate
  } = req.query;

  try {
    const auditData = await getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      userId,
      action,
      entity,
      startDate,
      endDate
    });

    logger.info('Admin accessed audit logs', {
      adminId: req.user.id,
      filters: { userId, action, entity, startDate, endDate }
    });

    res.json({
      success: true,
      data: auditData
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch audit logs' }
    });
  }
}));

// Security Dashboard
router.get('/security', asyncHandler(async (req, res) => {
  // Mock security metrics (implement with real data)
  const securityMetrics = {
    activeUsers: 142,
    lockedAccounts: 3,
    failedLoginAttempts: {
      last24h: 23,
      last7d: 156
    },
    suspiciousActivity: [
      {
        type: 'MULTIPLE_AUTH_FAILURES',
        count: 5,
        lastOccurrence: new Date(),
        ipAddress: '192.168.1.100'
      }
    ],
    recentLogins: [
      {
        userId: 'user-123',
        email: 'admin@example.com',
        ipAddress: '192.168.1.50',
        timestamp: new Date(),
        userAgent: 'Mozilla/5.0...'
      }
    ]
  };

  res.json({
    success: true,
    data: { metrics: securityMetrics }
  });
}));

// System Health
router.get('/system/health', asyncHandler(async (req, res) => {
  // Check system health
  const health = {
    database: 'healthy',
    emailService: 'healthy',
    aiServices: {
      openai: 'healthy',
      openrouter: 'disconnected'
    },
    paymentProviders: {
      stripe: 'healthy',
      paypal: 'healthy'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date()
  };

  res.json({
    success: true,
    data: { health }
  });
}));

// Clean expired tokens
router.post('/system/cleanup-tokens', asyncHandler(async (req, res) => {
  try {
    await authService.cleanupExpiredTokens();
    
    logger.info('Token cleanup executed by admin', { adminId: req.user.id });
    
    res.json({
      success: true,
      data: { message: 'Expired tokens cleaned up successfully' }
    });
  } catch (error) {
    logger.error('Token cleanup failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Token cleanup failed' }
    });
  }
}));

// Force logout user
router.post('/users/:id/logout', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // This would revoke all refresh tokens for the user
  logger.warn('User force-logout by admin', {
    adminId: req.user.id,
    targetUserId: id
  });

  res.json({
    success: true,
    data: { message: 'User logged out successfully' }
  });
}));

// Send admin notification
router.post('/notifications', asyncHandler(async (req, res) => {
  const { title, message, level = 'info', recipients = 'all' } = req.body;

  // Mock notification system
  logger.info('Admin notification sent', {
    adminId: req.user.id,
    title,
    level,
    recipients
  });

  res.json({
    success: true,
    data: { message: 'Notification sent successfully' }
  });
}));

export default router;