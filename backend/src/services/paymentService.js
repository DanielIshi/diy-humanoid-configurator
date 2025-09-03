import { logger } from '../lib/logger.js';
import Stripe from 'stripe';
import db from '../db/client.js';

class PaymentService {
  constructor() {
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;
    
    // Initialize payment providers
    this.stripe = null;
    this.paypal = null;
    
    // Supported currencies and regions
    this.supportedCurrencies = {
      stripe: ['eur', 'usd', 'gbp', 'chf'],
      paypal: ['EUR', 'USD', 'GBP', 'CHF']
    };
    
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

    // PayPal initialization
    if (this.paypalEnabled) {
      try {
        // Dynamic import für PayPal SDK
        const { PayPalServer } = await import('@paypal/paypal-server-sdk');
        this.paypal = new PayPalServer({
          clientId: process.env.PAYPAL_CLIENT_ID,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET,
          environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
        });
        logger.info('PayPal payment provider initialized');
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
    if (!this.paypalEnabled || !this.paypal) {
      throw new Error('PayPal payment is not configured');
    }

    const { total, currency = 'USD', orderId, customerInfo } = orderData;
    
    try {
      const payeeEmail = process.env.PAYPAL_RECEIVER_EMAIL;
      const request = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          amount: {
            currency_code: currency,
            value: total.toFixed(2)
          },
          description: `DIY Humanoid Order #${orderId}`,
          ...(payeeEmail ? { payee: { email_address: payeeEmail } } : {})
        }],
        application_context: {
          brand_name: 'DIY Humanoid Configurator',
          locale: 'en-US',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
      };

      const order = await this.paypal.orders.create(request);
      
      // Find approval URL
      const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;
      
      logger.info('PayPal payment created', { 
        orderId, 
        paypalOrderId: order.id,
        approvalUrl 
      });

      return {
        approvalUrl,
        paymentId: order.id,
        amount: total,
        currency,
        provider: 'paypal',
      };
    } catch (error) {
      logger.error('PayPal payment creation failed', { 
        orderId, 
        error: error.message 
      });
      throw new Error(`PayPal payment failed: ${error.message}`);
    }
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
    if (!this.paypalEnabled || !this.paypal) {
      throw new Error('PayPal payment is not configured');
    }

    try {
      const order = await this.paypal.orders.get(paymentId);
      
      if (order.status === 'APPROVED') {
        // Capture the payment
        const capture = await this.paypal.orders.capture(paymentId);
        
        const captureDetails = capture.purchase_units[0].payments.captures[0];
        
        return {
          status: captureDetails.status.toLowerCase() === 'completed' ? 'succeeded' : 'failed',
          amount: parseFloat(captureDetails.amount.value),
          currency: captureDetails.amount.currency_code,
          paymentId: capture.id,
          provider: 'paypal',
          metadata: {
            captureId: captureDetails.id,
            orderId: order.id
          }
        };
      } else {
        return {
          status: 'failed',
          amount: 0,
          currency: 'USD',
          paymentId,
          provider: 'paypal',
          error: `Order status: ${order.status}`
        };
      }
    } catch (error) {
      logger.error('PayPal payment confirmation failed', { 
        paymentId, 
        error: error.message 
      });
      throw new Error(`PayPal confirmation failed: ${error.message}`);
    }
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

  async refundPayPalPayment(captureId, amount, reason) {
    if (!this.paypalEnabled || !this.paypal) {
      throw new Error('PayPal payment is not configured');
    }

    try {
      const request = {
        amount: {
          value: amount ? amount.toFixed(2) : undefined,
          currency_code: 'USD'
        },
        note_to_payer: reason || 'Refund requested by customer'
      };

      const refund = await this.paypal.payments.captures.refund(captureId, request);
      
      logger.info('PayPal refund processed', { 
        refundId: refund.id,
        captureId,
        amount: refund.amount.value
      });

      return {
        refundId: refund.id,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code,
        status: refund.status.toLowerCase(),
        provider: 'paypal',
      };
    } catch (error) {
      logger.error('PayPal refund failed', { 
        captureId, 
        error: error.message 
      });
      throw new Error(`PayPal refund failed: ${error.message}`);
    }
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

  async validatePayPalWebhook(payload, headers) {
    if (!this.paypalEnabled) {
      throw new Error('PayPal webhook validation not configured');
    }

    try {
      // PayPal webhook validation
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!webhookId) {
        logger.warn('PayPal webhook ID not configured, skipping validation');
        return JSON.parse(payload);
      }

      // TODO: Implement PayPal webhook signature verification
      // For now, just parse the payload
      const event = JSON.parse(payload);
      
      logger.info('PayPal webhook validated', { eventType: event.event_type });
      return event;
    } catch (error) {
      logger.error('PayPal webhook validation failed', { error: error.message });
      throw new Error('Invalid PayPal webhook');
    }
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
        configured: !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET,
        webhookConfigured: !!process.env.PAYPAL_WEBHOOK_ID,
      },
    };
  }
}

export default PaymentService;
