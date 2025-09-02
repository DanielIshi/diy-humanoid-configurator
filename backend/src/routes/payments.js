import express from 'express';
import { OrderRepository } from '../repositories/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();
const orderRepository = new OrderRepository();

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
router.post('/stripe', 
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // TODO: Verify Stripe signature
    
    let event;
    try {
      // TODO: Parse Stripe event with signature verification
      event = JSON.parse(req.body);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err });
      return res.status(400).send('Webhook signature verification failed');
    }
    
    logger.info('Stripe webhook received', { eventType: event.type });
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object, 'stripe');
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object, 'stripe');
        break;
        
      case 'charge.dispute.created':
        await handlePaymentDispute(event.data.object, 'stripe');
        break;
        
      default:
        logger.warn('Unhandled Stripe event', { eventType: event.type });
    }
    
    res.json({ received: true });
  })
);

// POST /api/payment/paypal/webhook - PayPal-specific webhook
router.post('/paypal/webhook', asyncHandler(async (req, res) => {
  const event = req.body;
  
  logger.info('PayPal webhook received', { eventType: event.event_type });
  
  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      await handlePaymentSuccess(event.resource, 'paypal');
      break;
      
    case 'PAYMENT.CAPTURE.DENIED':
      await handlePaymentFailure(event.resource, 'paypal');
      break;
      
    case 'PAYMENT.CAPTURE.REFUNDED':
      await handlePaymentRefund(event.resource, 'paypal');
      break;
      
    default:
      logger.warn('Unhandled PayPal event', { eventType: event.event_type });
  }
  
  res.json({ received: true });
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

async function handlePaymentDispute(paymentData, provider) {
  const { id: paymentId, reason } = paymentData;
  
  logger.warn('Payment dispute received', { 
    paymentId, 
    provider, 
    reason 
  });
  
  // TODO: Handle dispute logic
  // TODO: Notify admin team
}

// GET /api/payment/methods - Get supported payment methods
router.get('/methods', (req, res) => {
  const methods = [
    {
      id: 'stripe',
      name: 'Credit Card (Stripe)',
      description: 'Pay with credit or debit card',
      enabled: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay with PayPal account',
      enabled: true,
    },
  ];
  
  res.json({
    success: true,
    data: { methods },
  });
});

export default router;

