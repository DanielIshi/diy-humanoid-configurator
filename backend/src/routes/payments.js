import express from 'express';
import { OrderRepository } from '../repositories/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { auth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import PaymentService from '../services/paymentService.js';

const router = express.Router();
const orderRepository = new OrderRepository();
const paymentService = new PaymentService();

// POST /api/payment/webhook - Payment provider webhooks (Stripe/PayPal)
router.post('/webhook', asyncHandler(async (req, res) => {
  const { event, data, provider = 'stripe' } = req.body || {};
  
  logger.info('Payment webhook received', { event, provider, paymentId: data?.id });
  
  try {
    switch (event) {
      case 'payment.succeeded':
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(data, provider);
        break;
        
      case 'payment.failed':
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(data, provider);
        break;
        
      case 'payment.refunded':
      case 'charge.refunded':
        await handlePaymentRefund(data, provider);
        break;
        
      default:
        logger.warn('Unhandled webhook event', { event, provider });
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', { error, event, provider });
    res.status(500).json({ 
      error: 'Webhook processing failed',
      received: false 
    });
  }
}));

// POST /api/payment/stripe/webhook - Stripe-specific webhook
router.post('/stripe/webhook', 
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    try {
      // Validate Stripe webhook signature
      event = await paymentService.validateWebhookSignature(req.body, sig, 'stripe');
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err.message });
      return res.status(400).send('Webhook signature verification failed');
    }
    
    logger.info('Stripe webhook received', { eventType: event.type, id: event.id });
    
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object, 'stripe');
          break;
          
        case 'payment_intent.payment_failed':
          await handlePaymentFailure(event.data.object, 'stripe');
          break;
          
        case 'payment_intent.canceled':
          await handlePaymentCancellation(event.data.object, 'stripe');
          break;
          
        case 'charge.dispute.created':
          await handlePaymentDispute(event.data.object, 'stripe');
          break;

        case 'invoice.payment_succeeded':
          // Handle subscription payments
          await handleSubscriptionPayment(event.data.object, 'stripe');
          break;
          
        default:
          logger.info('Unhandled Stripe event', { eventType: event.type });
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook processing failed', { 
        eventType: event.type, 
        eventId: event.id, 
        error: error.message 
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  })
);

// POST /api/payment/paypal/webhook - PayPal-specific webhook
router.post('/paypal/webhook', asyncHandler(async (req, res) => {
  let event;
  try {
    // Validate PayPal webhook signature
    event = await paymentService.validateWebhookSignature(req.body, req.headers, 'paypal');
  } catch (err) {
    logger.error('PayPal webhook validation failed', { error: err.message });
    return res.status(400).send('Webhook validation failed');
  }
  
  logger.info('PayPal webhook received', { 
    eventType: event.event_type, 
    id: event.id 
  });
  
  try {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentSuccess(event.resource, 'paypal');
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handlePaymentFailure(event.resource, 'paypal');
        break;
        
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentRefund(event.resource, 'paypal');
        break;
        
      case 'PAYMENT.CAPTURE.REVERSED':
        await handlePaymentDispute(event.resource, 'paypal');
        break;
        
      default:
        logger.info('Unhandled PayPal event', { eventType: event.event_type });
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('PayPal webhook processing failed', { 
      eventType: event.event_type, 
      eventId: event.id, 
      error: error.message 
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// Helper functions for payment processing
async function handlePaymentSuccess(paymentData, provider) {
  const { id: paymentId, amount, currency = 'USD' } = paymentData;
  
  // Find order by payment ID
  const orders = await orderRepository.findAll({
    where: { paymentId },
    include: { user: true },
  });
  
  if (orders.length === 0) {
    logger.warn('No order found for successful payment', { paymentId, provider });
    return;
  }
  
  const order = orders[0];
  
  // Update order payment status
  await orderRepository.updatePaymentStatus(order.id, 'COMPLETED');
  
  // Add payment record
  await orderRepository.addPayment(order.id, {
    paymentId,
    provider,
    amount: typeof amount === 'number' ? amount : parseFloat(amount) / 100, // Handle cents
    currency,
    status: 'COMPLETED',
    paymentData,
  });
  
  // Update order status to processing if still pending
  if (order.status === 'PENDING') {
    await orderRepository.updateStatus(order.id, 'PROCESSING');
  }
  
  logger.info('Payment success processed', { 
    orderId: order.id, 
    paymentId, 
    provider,
    amount 
  });
  
  // TODO: Send confirmation email
  // TODO: Trigger manual generation
}

async function handlePaymentFailure(paymentData, provider) {
  const { id: paymentId, failure_reason } = paymentData;
  
  // Find order by payment ID
  const orders = await orderRepository.findAll({
    where: { paymentId },
  });
  
  if (orders.length === 0) {
    logger.warn('No order found for failed payment', { paymentId, provider });
    return;
  }
  
  const order = orders[0];
  
  // Update order payment status
  await orderRepository.updatePaymentStatus(order.id, 'FAILED');
  
  // Add payment record
  await orderRepository.addPayment(order.id, {
    paymentId,
    provider,
    amount: 0,
    currency: 'USD',
    status: 'FAILED',
    paymentData: { ...paymentData, failure_reason },
  });
  
  logger.info('Payment failure processed', { 
    orderId: order.id, 
    paymentId, 
    provider,
    failure_reason 
  });
  
  // TODO: Send failure notification email
}

async function handlePaymentRefund(paymentData, provider) {
  const { id: paymentId, amount } = paymentData;
  
  // Find order by payment ID
  const orders = await orderRepository.findAll({
    where: { paymentId },
  });
  
  if (orders.length === 0) {
    logger.warn('No order found for refunded payment', { paymentId, provider });
    return;
  }
  
  const order = orders[0];
  
  // Update order status to refunded
  await orderRepository.updateStatus(order.id, 'REFUNDED');
  await orderRepository.updatePaymentStatus(order.id, 'REFUNDED');
  
  // Add refund payment record
  await orderRepository.addPayment(order.id, {
    paymentId: `refund_${paymentId}`,
    provider,
    amount: -(typeof amount === 'number' ? amount : parseFloat(amount) / 100),
    currency: 'USD',
    status: 'REFUNDED',
    paymentData,
  });
  
  logger.info('Payment refund processed', { 
    orderId: order.id, 
    paymentId, 
    provider,
    amount 
  });
  
  // TODO: Send refund confirmation email
}

async function handlePaymentCancellation(paymentData, provider) {
  const { id: paymentId } = paymentData;
  
  // Find order by payment ID
  const orders = await orderRepository.findAll({
    where: { paymentId },
  });
  
  if (orders.length === 0) {
    logger.warn('No order found for cancelled payment', { paymentId, provider });
    return;
  }
  
  const order = orders[0];
  
  // Update order payment status
  await orderRepository.updatePaymentStatus(order.id, 'CANCELLED');
  
  logger.info('Payment cancellation processed', { 
    orderId: order.id, 
    paymentId, 
    provider 
  });
}

async function handleSubscriptionPayment(invoiceData, provider) {
  const { subscription: subscriptionId, amount_paid } = invoiceData;
  
  logger.info('Subscription payment received', { 
    subscriptionId, 
    amount_paid, 
    provider 
  });
  
  // TODO: Handle subscription payment logic
  // This would be for recurring payments/subscriptions
}

async function handlePaymentDispute(paymentData, provider) {
  const { id: paymentId, reason } = paymentData;
  
  // Find order by payment ID
  const orders = await orderRepository.findAll({
    where: { paymentId },
  });
  
  if (orders.length > 0) {
    const order = orders[0];
    await orderRepository.updatePaymentStatus(order.id, 'DISPUTED');
    
    // Add dispute record
    await orderRepository.addPayment(order.id, {
      paymentId: `dispute_${paymentId}`,
      provider,
      amount: 0,
      currency: 'USD',
      status: 'DISPUTED',
      paymentData: { ...paymentData, reason },
    });
  }
  
  logger.warn('Payment dispute processed', { 
    paymentId, 
    provider, 
    reason 
  });
  
  // TODO: Send dispute notification to admin team
}

// POST /api/payment/create-intent - Create payment intent
router.post('/create-intent', auth, asyncHandler(async (req, res) => {
  const { orderId, paymentMethod = 'stripe' } = req.body;
  
  if (!orderId) {
    return res.status(400).json({
      error: 'Order ID is required'
    });
  }

  // Get order details
  const order = await orderRepository.findById(orderId);
  if (!order) {
    return res.status(404).json({
      error: 'Order not found'
    });
  }

  // Verify order ownership
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access denied'
    });
  }

  if (order.paymentStatus === 'COMPLETED') {
    return res.status(400).json({
      error: 'Order already paid'
    });
  }

  const orderData = {
    total: order.totalPrice,
    currency: order.currency || 'eur',
    orderId: order.id,
    customerInfo: {
      email: req.user.email,
      name: req.user.name
    }
  };

  const paymentIntent = await paymentService.createPaymentIntent(orderData, paymentMethod);
  
  // Update order with payment ID
  await orderRepository.updatePaymentId(orderId, paymentIntent.paymentIntentId || paymentIntent.paymentId);
  
  res.json({
    success: true,
    data: paymentIntent
  });
}));

// POST /api/payment/confirm - Confirm payment
router.post('/confirm', auth, asyncHandler(async (req, res) => {
  const { paymentId, paymentMethod = 'stripe' } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({
      error: 'Payment ID is required'
    });
  }

  const result = await paymentService.confirmPayment(paymentId, paymentMethod);
  
  res.json({
    success: true,
    data: result
  });
}));

// POST /api/payment/refund - Process refund
router.post('/refund', auth, asyncHandler(async (req, res) => {
  const { orderId, amount, reason } = req.body;
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }

  if (!orderId) {
    return res.status(400).json({
      error: 'Order ID is required'
    });
  }

  // Get order details
  const order = await orderRepository.findById(orderId);
  if (!order) {
    return res.status(404).json({
      error: 'Order not found'
    });
  }

  if (order.paymentStatus !== 'COMPLETED') {
    return res.status(400).json({
      error: 'Order payment not completed'
    });
  }

  // Get payment method from order history
  const payments = await orderRepository.getPayments(orderId);
  const successfulPayment = payments.find(p => p.status === 'COMPLETED');
  
  if (!successfulPayment) {
    return res.status(400).json({
      error: 'No successful payment found'
    });
  }

  const refund = await paymentService.refundPayment(
    successfulPayment.paymentId, 
    amount, 
    successfulPayment.provider, 
    reason
  );
  
  // Update order status
  await orderRepository.updatePaymentStatus(orderId, 'REFUNDED');
  await orderRepository.updateStatus(orderId, 'REFUNDED');
  
  res.json({
    success: true,
    data: refund
  });
}));

// GET /api/payment/methods - Get supported payment methods
router.get('/methods', asyncHandler(async (req, res) => {
  const methods = await paymentService.getPaymentMethods();
  
  res.json({
    success: true,
    data: { methods },
  });
}));

// GET /api/payment/status - Get payment provider status
router.get('/status', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }

  const status = paymentService.getProviderStatus();
  
  res.json({
    success: true,
    data: status
  });
}));

export default router;

