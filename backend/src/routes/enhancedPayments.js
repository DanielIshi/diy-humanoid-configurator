// Enhanced Payment API Routes für Issue #5
// REST API für Stripe/PayPal Integration mit Webhooks

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
// Simple JSON Schema validation helper
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // Simple validation based on schema
    if (schema.required) {
      for (const field of schema.required) {
        if (!req.body[field]) {
          errors.push(`${field} is required`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};
import rateLimit from 'express-rate-limit';
import { logger } from '../lib/logger.js';
import stripeOnlyPaymentService from '../services/stripeOnlyPaymentService.js';

const router = express.Router();

// Rate limiting für Payment-Operationen
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // Max 10 Payment-Requests pro 15 Min pro IP
  message: {
    error: 'Zu viele Payment-Anfragen. Bitte warten Sie.',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
  }
});

const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 100, // Max 100 Webhooks pro Minute (für Provider)
  message: { error: 'Webhook rate limit exceeded' }
});

// Validation Schemas
const createPaymentSchema = {
  type: 'object',
  required: ['orderId', 'amount', 'currency'],
  properties: {
    orderId: { type: 'string', minLength: 1, maxLength: 100 },
    amount: { type: 'number', minimum: 0.01, maximum: 100000 },
    currency: { 
      type: 'string', 
      enum: ['EUR', 'USD', 'GBP', 'CHF'],
      default: 'EUR'
    },
    paymentMethod: { 
      type: 'string',
      enum: ['stripe', 'stripe_card', 'stripe_sepa', 'stripe_giropay', 'stripe_sofort', 'paypal'],
      default: 'stripe'
    },
    customerInfo: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', maxLength: 200 }
      }
    },
    metadata: { type: 'object' }
  }
};

const confirmPaymentSchema = {
  type: 'object',
  required: ['paymentIntentId'],
  properties: {
    paymentIntentId: { type: 'string', minLength: 1 },
    provider: { 
      type: 'string', 
      enum: ['stripe', 'paypal'], 
      default: 'stripe' 
    }
  }
};

const refundSchema = {
  type: 'object',
  required: ['paymentIntentId'],
  properties: {
    paymentIntentId: { type: 'string', minLength: 1 },
    amount: { type: 'number', minimum: 0.01 }, // Optional - full refund wenn nicht angegeben
    reason: { 
      type: 'string',
      enum: ['requested_by_customer', 'duplicate', 'fraudulent', 'other'],
      default: 'requested_by_customer'
    },
    provider: { 
      type: 'string', 
      enum: ['stripe', 'paypal'], 
      default: 'stripe' 
    }
  }
};

/**
 * POST /api/payments/create-intent
 * Erstellt Payment Intent für Bestellung
 */
router.post('/create-intent',
  paymentRateLimit,
  requireAuth,
  validateRequest(createPaymentSchema),
  async (req, res) => {
    const { orderId, amount, currency, paymentMethod, customerInfo, metadata } = req.body;
    const userId = req.user.id;

    logger.info('Creating payment intent', { 
      userId, 
      orderId, 
      amount, 
      currency, 
      paymentMethod 
    });

    try {
      // Zusätzliche Validierung: Order gehört User
      // TODO: Implement order ownership check
      
      const paymentIntent = await stripeOnlyPaymentService.createPaymentIntent({
        orderId,
        amount,
        currency,
        paymentMethod,
        customerInfo: {
          ...customerInfo,
          userId
        },
        metadata: {
          userId,
          ...metadata
        }
      });

      res.status(201).json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentMethod === 'stripe' ? paymentIntent.clientSecret : undefined,
          approvalUrl: paymentMethod === 'paypal' ? paymentIntent.approvalUrl : undefined,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          provider: paymentIntent.provider,
          status: paymentIntent.status
        }
      });

    } catch (error) {
      logger.error('Payment intent creation failed', {
        error: error.message,
        userId,
        orderId
      });

      res.status(400).json({
        success: false,
        error: 'Payment intent creation failed',
        message: error.message,
        code: 'PAYMENT_INTENT_FAILED'
      });
    }
  }
);

/**
 * POST /api/payments/confirm
 * Bestätigt/Captured Payment
 */
router.post('/confirm',
  paymentRateLimit,
  requireAuth,
  validateRequest(confirmPaymentSchema),
  async (req, res) => {
    const { paymentIntentId, provider } = req.body;
    const userId = req.user.id;

    logger.info('Confirming payment', { userId, paymentIntentId, provider });

    try {
      const result = await stripeOnlyPaymentService.confirmPayment(paymentIntentId, provider);

      res.status(200).json({
        success: true,
        payment: {
          id: paymentIntentId,
          status: result.status,
          provider
        },
        message: 'Payment confirmed successfully'
      });

    } catch (error) {
      logger.error('Payment confirmation failed', {
        error: error.message,
        userId,
        paymentIntentId,
        provider
      });

      res.status(400).json({
        success: false,
        error: 'Payment confirmation failed',
        message: error.message,
        code: 'PAYMENT_CONFIRMATION_FAILED'
      });
    }
  }
);

/**
 * POST /api/payments/refund
 * Verarbeitet Rückerstattung
 */
router.post('/refund',
  paymentRateLimit,
  requireAuth, // Only admins should be able to refund in production
  validateRequest(refundSchema),
  async (req, res) => {
    const { paymentIntentId, amount, reason, provider } = req.body;
    const userId = req.user.id;

    logger.info('Processing refund', { 
      userId, 
      paymentIntentId, 
      amount, 
      reason, 
      provider 
    });

    try {
      // TODO: Add admin permission check
      const refund = await stripeOnlyPaymentService.processRefund(
        paymentIntentId, 
        amount, 
        reason, 
        provider
      );

      res.status(200).json({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount || 'full',
          status: refund.status,
          reason
        },
        message: 'Refund processed successfully'
      });

    } catch (error) {
      logger.error('Refund processing failed', {
        error: error.message,
        userId,
        paymentIntentId
      });

      res.status(400).json({
        success: false,
        error: 'Refund processing failed',
        message: error.message,
        code: 'REFUND_FAILED'
      });
    }
  }
);

/**
 * GET /api/payments/methods
 * Holt verfügbare Zahlungsmethoden
 */
router.get('/methods',
  async (req, res) => {
    const { amount = 100, currency = 'EUR' } = req.query;

    try {
      const methods = stripeOnlyPaymentService.getAvailablePaymentMethods(
        parseFloat(amount),
        currency.toUpperCase()
      );

      res.status(200).json({
        success: true,
        paymentMethods: methods,
        currency: currency.toUpperCase(),
        amount: parseFloat(amount)
      });

    } catch (error) {
      logger.error('Failed to get payment methods', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment methods',
        code: 'PAYMENT_METHODS_FAILED'
      });
    }
  }
);

/**
 * GET /api/payments/:paymentId
 * Holt Payment-Details
 */
router.get('/:paymentId',
  requireAuth,
  async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user.id;

    try {
      // TODO: Implement database query for payment details
      // Ensure payment belongs to user
      
      res.status(200).json({
        success: true,
        payment: {
          id: paymentId,
          // Add payment details from database
        }
      });

    } catch (error) {
      logger.error('Failed to get payment details', {
        error: error.message,
        paymentId,
        userId
      });

      res.status(404).json({
        success: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      });
    }
  }
);

/**
 * POST /api/payments/webhooks/stripe
 * Stripe Webhook Handler
 */
router.post('/webhooks/stripe',
  webhookRateLimit,
  express.raw({ type: 'application/json' }), // Raw body needed for signature verification
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      await stripeOnlyPaymentService.handleStripeWebhook(req.body, sig);
      
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Stripe webhook handling failed', { error: error.message });
      
      res.status(400).json({
        error: 'Webhook handling failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/payments/webhooks/paypal
 * PayPal Webhook Handler
 */
router.post('/webhooks/paypal',
  webhookRateLimit,
  express.json(),
  async (req, res) => {
    try {
      await enhancedPaymentService.handlePayPalWebhook(
        JSON.stringify(req.body), 
        req.headers
      );
      
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('PayPal webhook handling failed', { error: error.message });
      
      res.status(400).json({
        error: 'Webhook handling failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/payments/health
 * Payment System Health Check
 */
router.get('/health',
  async (req, res) => {
    try {
      const health = await stripeOnlyPaymentService.healthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('Payment health check failed', { error: error.message });
      
      res.status(500).json({
        status: 'down',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/payments/config
 * Returns client-side payment configuration
 */
router.get('/config',
  async (req, res) => {
    try {
      const config = {
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        paypalClientId: process.env.PAYPAL_CLIENT_ID,
        supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF'],
        defaultCurrency: 'EUR',
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json({
        success: true,
        config
      });

    } catch (error) {
      logger.error('Failed to get payment config', { error: error.message });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get payment configuration',
        code: 'PAYMENT_CONFIG_FAILED'
      });
    }
  }
);

export default router;