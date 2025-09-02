import express from 'express';
import { OrderRepository, ManualRepository } from '../repositories/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();
const orderRepository = new OrderRepository();
const manualRepository = new ManualRepository();

// GET /api/orders - Get all orders (admin) or user's orders
router.get('/', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, userId } = req.query;
    
    logger.info('Fetching orders', { page, limit, status, userId });
    
    let orders;
    const options = {
      skip: (page - 1) * limit,
      take: parseInt(limit),
    };

    if (userId) {
      orders = await orderRepository.findByUser(userId, options);
    } else if (status) {
      orders = await orderRepository.findByStatus(status, options);
    } else {
      orders = await orderRepository.findAll({
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...options,
      });
    }

    const total = await orderRepository.count(
      userId ? { userId } : status ? { status } : {}
    );
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// POST /api/orders - Create new order
router.post('/',
  validate(schemas.createOrder, 'body'),
  asyncHandler(async (req, res) => {
    const { items, customerInfo, paymentMethod, configurationId, userId } = req.body;
    
    logger.info('Creating order', { customerEmail: customerInfo?.email });
    
    // Calculate total from items
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
      total,
      customerInfo,
      paymentMethod,
      userId,
      configurationId,
    };
    
    const { order, items: orderItems } = await orderRepository.createOrderWithItems(
      orderData, 
      items
    );
    
    res.status(201).json({
      success: true,
      data: { 
        order: {
          ...order,
          items: orderItems,
        }
      },
    });
  })
);

// GET /api/orders/:id - Get single order
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const order = await orderRepository.findById(id, {
    items: {
      include: { product: true }
    },
    payments: true,
    configuration: {
      include: { 
        components: {
          include: { product: true }
        }
      }
    },
    user: { select: { id: true, name: true, email: true } },
    manuals: true,
  });
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { message: 'Order not found' },
    });
  }
  
  logger.info('Fetched order', { orderId: id });
  
  res.json({
    success: true,
    data: { order },
  });
}));

// GET /api/orders/number/:orderNumber - Get order by order number
router.get('/number/:orderNumber', asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;
  
  const order = await orderRepository.findByOrderNumber(orderNumber);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { message: 'Order not found' },
    });
  }
  
  logger.info('Fetched order by number', { orderNumber });
  
  res.json({
    success: true,
    data: { order },
  });
}));

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status',
  // TODO: Add admin authentication middleware
  validate(schemas.updateOrderStatus, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await orderRepository.updateStatus(id, status);
    
    logger.info('Updated order status', { orderId: id, status });
    
    res.json({
      success: true,
      data: { order },
    });
  })
);

// PATCH /api/orders/:id/payment-status - Update payment status
router.patch('/:id/payment-status',
  // TODO: Add admin authentication middleware
  validate(schemas.updatePaymentStatus, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    
    const order = await orderRepository.updatePaymentStatus(id, paymentStatus);
    
    logger.info('Updated payment status', { orderId: id, paymentStatus });
    
    res.json({
      success: true,
      data: { order },
    });
  })
);

// PATCH /api/orders/:id/tracking - Update tracking information
router.patch('/:id/tracking',
  // TODO: Add admin authentication middleware
  validate(schemas.updateTracking, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { trackingNumber, shippingMethod, estimatedDelivery } = req.body;
    
    const order = await orderRepository.updateTracking(
      id, 
      trackingNumber, 
      shippingMethod, 
      estimatedDelivery ? new Date(estimatedDelivery) : null
    );
    
    logger.info('Updated tracking info', { orderId: id, trackingNumber });
    
    res.json({
      success: true,
      data: { order },
    });
  })
);

// GET /api/orders/:id/manual - Get assembly manual for order
router.get('/:id/manual', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if order exists
  const order = await orderRepository.findById(id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: { message: 'Order not found' },
    });
  }
  
  // Find existing manual or generate new one
  let manual = await manualRepository.findLatestManualForOrder(id);
  
  if (!manual) {
    // Generate new manual
    manual = await manualRepository.generateManualForOrder(id);
    // TODO: Integrate with manual generation service
  }
  
  res.json({
    success: true,
    data: { manual },
  });
}));

export default router;

