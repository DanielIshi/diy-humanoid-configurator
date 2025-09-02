import { logger } from '../lib/logger.js';

class PaymentService {
  constructor() {
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID;
    
    // Initialize payment providers
    this.stripe = null;
    this.paypal = null;
    
    this.initializeProviders();
  }

  async initializeProviders() {
    // Stripe initialization
    if (this.stripeEnabled) {
      try {
        const Stripe = await import('stripe');
        this.stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY);
        logger.info('Stripe payment provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Stripe', { error: error.message });
        this.stripeEnabled = false;
      }
    }

    // PayPal initialization (stub)
    if (this.paypalEnabled) {
      try {
        // TODO: Initialize PayPal SDK
        logger.info('PayPal payment provider initialized (stub)');
      } catch (error) {
        logger.error('Failed to initialize PayPal', { error: error.message });
        this.paypalEnabled = false;
      }
    }
  }

  async createPaymentIntent(orderData, paymentMethod = 'stripe') {
    try {
      const { total, currency = 'usd', orderId, customerInfo } = orderData;
      
      logger.info('Creating payment intent', { 
        orderId, 
        total, 
        currency, 
        paymentMethod 
      });

      switch (paymentMethod) {
        case 'stripe':
          return await this.createStripePaymentIntent(orderData);
        case 'paypal':
          return await this.createPayPalPayment(orderData);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to create payment intent', { 
        orderData, 
        error: error.message 
      });
      throw error;
    }
  }

  async createStripePaymentIntent(orderData) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe payment is not configured');
    }

    const { total, currency = 'usd', orderId, customerInfo } = orderData;
    
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          customerEmail: customerInfo?.email,
        },
        description: `DIY Humanoid Order #${orderId}`,
        receipt_email: customerInfo?.email,
      });

      logger.info('Stripe payment intent created', { 
        paymentIntentId: paymentIntent.id,
        orderId 
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: total,
        currency,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe payment intent creation failed', { 
        orderId, 
        error: error.message 
      });
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  async createPayPalPayment(orderData) {
    // PayPal implementation stub
    const { total, currency = 'USD', orderId } = orderData;
    
    logger.info('Creating PayPal payment (stub)', { orderId, total });

    // TODO: Implement actual PayPal SDK integration
    return {
      approvalUrl: `https://sandbox.paypal.com/checkoutnow?token=STUB_${orderId}`,
      paymentId: `PAY_STUB_${Date.now()}`,
      amount: total,
      currency,
      provider: 'paypal',
    };
  }

  async confirmPayment(paymentId, paymentMethod = 'stripe') {
    try {
      logger.info('Confirming payment', { paymentId, paymentMethod });

      switch (paymentMethod) {
        case 'stripe':
          return await this.confirmStripePayment(paymentId);
        case 'paypal':
          return await this.confirmPayPalPayment(paymentId);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to confirm payment', { 
        paymentId, 
        paymentMethod, 
        error: error.message 
      });
      throw error;
    }
  }

  async confirmStripePayment(paymentIntentId) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe payment is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentId: paymentIntent.id,
        provider: 'stripe',
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      logger.error('Stripe payment confirmation failed', { 
        paymentIntentId, 
        error: error.message 
      });
      throw new Error(`Stripe confirmation failed: ${error.message}`);
    }
  }

  async confirmPayPalPayment(paymentId) {
    // PayPal confirmation stub
    logger.info('Confirming PayPal payment (stub)', { paymentId });

    // TODO: Implement actual PayPal payment confirmation
    return {
      status: 'succeeded',
      amount: 0, // Would get from PayPal API
      currency: 'USD',
      paymentId,
      provider: 'paypal',
    };
  }

  async refundPayment(paymentId, amount, paymentMethod = 'stripe', reason = '') {
    try {
      logger.info('Processing refund', { 
        paymentId, 
        amount, 
        paymentMethod, 
        reason 
      });

      switch (paymentMethod) {
        case 'stripe':
          return await this.refundStripePayment(paymentId, amount, reason);
        case 'paypal':
          return await this.refundPayPalPayment(paymentId, amount, reason);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      logger.error('Failed to process refund', { 
        paymentId, 
        amount, 
        error: error.message 
      });
      throw error;
    }
  }

  async refundStripePayment(paymentIntentId, amount, reason) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe payment is not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents or full refund
        reason: reason || 'requested_by_customer',
      });

      logger.info('Stripe refund processed', { 
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount / 100
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        provider: 'stripe',
      };
    } catch (error) {
      logger.error('Stripe refund failed', { 
        paymentIntentId, 
        error: error.message 
      });
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }

  async refundPayPalPayment(paymentId, amount, reason) {
    // PayPal refund stub
    logger.info('Processing PayPal refund (stub)', { paymentId, amount, reason });

    // TODO: Implement actual PayPal refund
    return {
      refundId: `REFUND_STUB_${Date.now()}`,
      amount,
      currency: 'USD',
      status: 'completed',
      provider: 'paypal',
    };
  }

  async getPaymentMethods() {
    const methods = [];

    if (this.stripeEnabled) {
      methods.push({
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay securely with your credit or debit card',
        enabled: true,
        type: 'card',
      });
    }

    if (this.paypalEnabled) {
      methods.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with your PayPal account',
        enabled: true,
        type: 'wallet',
      });
    }

    return methods;
  }

  async validateWebhookSignature(payload, signature, provider) {
    try {
      switch (provider) {
        case 'stripe':
          return await this.validateStripeWebhook(payload, signature);
        case 'paypal':
          return await this.validatePayPalWebhook(payload, signature);
        default:
          throw new Error(`Unsupported webhook provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Webhook signature validation failed', { 
        provider, 
        error: error.message 
      });
      throw error;
    }
  }

  async validateStripeWebhook(payload, signature) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe webhook validation not configured');
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return event;
    } catch (error) {
      logger.error('Stripe webhook signature invalid', { error: error.message });
      throw new Error('Invalid Stripe webhook signature');
    }
  }

  async validatePayPalWebhook(payload, signature) {
    // PayPal webhook validation stub
    logger.info('Validating PayPal webhook (stub)', { signature });
    
    // TODO: Implement actual PayPal webhook validation
    return JSON.parse(payload);
  }

  getProviderStatus() {
    return {
      stripe: {
        enabled: this.stripeEnabled,
        configured: !!process.env.STRIPE_SECRET_KEY,
        webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      },
      paypal: {
        enabled: this.paypalEnabled,
        configured: !!process.env.PAYPAL_CLIENT_ID,
        webhookConfigured: true, // Stub
      },
    };
  }
}

export default PaymentService;