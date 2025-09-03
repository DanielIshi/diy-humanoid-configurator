// Simplified Payment Service - Stripe Only für Issue #5
// Fokus auf Stripe Integration, PayPal wird später hinzugefügt

import { logger } from '../lib/logger.js';
import Stripe from 'stripe';
import crypto from 'crypto';

class StripeOnlyPaymentService {
  constructor() {
    // Environment detection
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Stripe configuration
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    this.stripe = null;
    
    this.initializeStripe();
  }

  async initializeStripe() {
    try {
      if (this.stripeEnabled) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16',
          telemetry: false
        });
        logger.info('Stripe payment service initialized', { 
          production: this.isProduction 
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Stripe', { error: error.message });
      throw new Error('Payment system initialization failed');
    }
  }

  /**
   * Creates a payment intent for the given order
   */
  async createPaymentIntent({ 
    orderId, 
    amount, 
    currency = 'EUR', 
    paymentMethod = 'stripe', 
    customerInfo = {}, 
    metadata = {} 
  }) {
    try {
      logger.info('Creating payment intent', { 
        orderId, 
        amount, 
        currency, 
        paymentMethod 
      });

      // Only Stripe supported for now
      if (paymentMethod.startsWith('stripe')) {
        return await this.createStripePaymentIntent({
          orderId,
          amount,
          currency,
          paymentMethod,
          customerInfo,
          metadata
        });
      }

      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    } catch (error) {
      logger.error('Payment intent creation failed', { 
        error: error.message, 
        orderId 
      });
      throw error;
    }
  }

  /**
   * Create Stripe Payment Intent
   */
  async createStripePaymentIntent({ 
    orderId, 
    amount, 
    currency, 
    paymentMethod, 
    customerInfo, 
    metadata 
  }) {
    if (!this.stripe) throw new Error('Stripe not initialized');

    // Convert to cents for Stripe
    const stripeAmount = Math.round(amount * 100);
    const stripeCurrency = currency.toLowerCase();

    const intentData = {
      amount: stripeAmount,
      currency: stripeCurrency,
      metadata: {
        orderId: orderId.toString(),
        paymentMethod,
        ...metadata
      },
      description: `DIY Humanoid Configurator - Bestellung #${orderId}`,
    };

    // Add customer info if provided
    if (customerInfo.email) {
      intentData.receipt_email = customerInfo.email;
    }

    // Configure payment method types based on selection
    switch (paymentMethod) {
      case 'stripe_card':
        intentData.payment_method_types = ['card'];
        intentData.automatic_payment_methods = {
          enabled: false
        };
        break;
      case 'stripe_sepa':
        intentData.payment_method_types = ['sepa_debit'];
        break;
      case 'stripe_giropay':
        intentData.payment_method_types = ['giropay'];
        break;
      case 'stripe_sofort':
        intentData.payment_method_types = ['sofort'];
        break;
      default:
        intentData.automatic_payment_methods = {
          enabled: true
        };
    }

    const paymentIntent = await this.stripe.paymentIntents.create(intentData);

    logger.info('Stripe payment intent created', { 
      paymentIntentId: paymentIntent.id,
      orderId,
      amount: stripeAmount,
      currency: stripeCurrency
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      currency: currency,
      status: paymentIntent.status,
      provider: 'stripe'
    };
  }

  /**
   * Confirm Payment
   */
  async confirmPayment(paymentIntentId, provider = 'stripe') {
    try {
      logger.info('Confirming payment', { paymentIntentId, provider });

      if (provider === 'stripe') {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        
        logger.info('Payment confirmed', { 
          paymentIntentId, 
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100
        });

        return {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          provider: 'stripe'
        };
      }

      throw new Error(`Unsupported provider: ${provider}`);
    } catch (error) {
      logger.error('Payment confirmation failed', { 
        error: error.message,
        paymentIntentId,
        provider
      });
      throw error;
    }
  }

  /**
   * Process Refund
   */
  async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer', provider = 'stripe') {
    try {
      logger.info('Processing refund', { 
        paymentIntentId, 
        amount, 
        reason,
        provider
      });

      if (provider === 'stripe') {
        const refundData = {
          payment_intent: paymentIntentId,
          reason
        };

        if (amount !== null) {
          refundData.amount = Math.round(amount * 100);
        }

        const refund = await this.stripe.refunds.create(refundData);

        logger.info('Refund processed', { 
          refundId: refund.id,
          paymentIntentId,
          amount: refund.amount / 100,
          status: refund.status
        });

        return {
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
          provider: 'stripe'
        };
      }

      throw new Error(`Unsupported provider: ${provider}`);
    } catch (error) {
      logger.error('Refund processing failed', { 
        error: error.message,
        paymentIntentId,
        provider
      });
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  getAvailablePaymentMethods(amount, currency) {
    const methods = [];

    if (this.stripeEnabled) {
      methods.push(
        {
          id: 'stripe_card',
          name: 'Kreditkarte',
          type: 'card',
          description: 'Visa, Mastercard, American Express',
          enabled: true,
          fees: this.calculateStripeFees(amount, 'card')
        },
        {
          id: 'stripe_sepa',
          name: 'SEPA-Lastschrift',
          type: 'bank_debit',
          description: 'Lastschrift von EU-Bankkonto',
          enabled: currency.toUpperCase() === 'EUR',
          fees: this.calculateStripeFees(amount, 'sepa_debit')
        },
        {
          id: 'stripe_giropay',
          name: 'Giropay',
          type: 'bank_redirect',
          description: 'Online-Banking Deutschland',
          enabled: currency.toUpperCase() === 'EUR',
          fees: this.calculateStripeFees(amount, 'giropay')
        },
        {
          id: 'stripe_sofort',
          name: 'Sofortüberweisung',
          type: 'bank_redirect',
          description: 'Sofort Banking',
          enabled: ['EUR', 'GBP', 'CHF'].includes(currency.toUpperCase()),
          fees: this.calculateStripeFees(amount, 'sofort')
        }
      );
    }

    return methods.filter(method => method.enabled);
  }

  /**
   * Calculate Stripe fees (approximation)
   */
  calculateStripeFees(amount, paymentType) {
    const baseAmount = parseFloat(amount);
    let feePercentage, fixedFee;

    switch (paymentType) {
      case 'card':
        feePercentage = 0.0294; // 2.9% + 0.25€
        fixedFee = 0.25;
        break;
      case 'sepa_debit':
        feePercentage = 0.0035; // 0.35%
        fixedFee = 0;
        break;
      case 'giropay':
      case 'sofort':
        feePercentage = 0.014; // 1.4%
        fixedFee = 0.25;
        break;
      default:
        feePercentage = 0.029;
        fixedFee = 0.25;
    }

    return {
      percentage: feePercentage,
      fixed: fixedFee,
      total: (baseAmount * feePercentage) + fixedFee
    };
  }

  /**
   * Handle Stripe Webhook
   */
  async handleStripeWebhook(rawBody, signature) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
      
      logger.info('Stripe webhook received', { 
        eventType: event.type,
        eventId: event.id 
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object);
          break;
        default:
          logger.info('Unhandled webhook event type', { eventType: event.type });
      }

      return true;
    } catch (error) {
      logger.error('Stripe webhook handling failed', { error: error.message });
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    logger.info('Payment succeeded', { 
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      orderId: paymentIntent.metadata.orderId
    });
    // TODO: Update order status in database
  }

  async handlePaymentIntentFailed(paymentIntent) {
    logger.warn('Payment failed', { 
      paymentIntentId: paymentIntent.id,
      orderId: paymentIntent.metadata.orderId
    });
    // TODO: Update order status in database
  }

  async handlePaymentIntentCanceled(paymentIntent) {
    logger.info('Payment canceled', { 
      paymentIntentId: paymentIntent.id,
      orderId: paymentIntent.metadata.orderId
    });
    // TODO: Update order status in database
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: {
          stripe: {
            enabled: this.stripeEnabled,
            status: this.stripeEnabled ? 'available' : 'disabled'
          }
        }
      };

      if (this.stripeEnabled) {
        // Test Stripe connection
        await this.stripe.accounts.retrieve();
      }

      return health;
    } catch (error) {
      logger.error('Payment service health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
const stripeOnlyPaymentService = new StripeOnlyPaymentService();
export default stripeOnlyPaymentService;