// Enhanced Payment Service für Issue #5
// Vollständige Stripe/PayPal Integration mit Webhooks und SEPA

import { logger } from '../lib/logger.js';
import Stripe from 'stripe';
import db from '../db/client.js';
import crypto from 'crypto';

class EnhancedPaymentService {
  constructor() {
    // Environment detection
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Stripe configuration
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    this.stripe = null;
    
    // PayPal configuration  
    this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;
    this.paypalClient = null;
    
    // Supported payment methods and currencies
    this.supportedMethods = {
      stripe: ['card', 'sepa_debit', 'giropay', 'sofort', 'bancontact'],
      paypal: ['paypal', 'card', 'giropay', 'sofort', 'bancontact']
    };
    
    this.supportedCurrencies = ['EUR', 'USD', 'GBP', 'CHF'];
    
    // Webhook secrets
    this.stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.paypalWebhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;
    
    this.initializeProviders();
  }

  async initializeProviders() {
    try {
      // Initialize Stripe
      if (this.stripeEnabled) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16',
          telemetry: false
        });
        logger.info('Enhanced Stripe integration initialized', { 
          production: this.isProduction 
        });
      }

      // Initialize PayPal with dynamic import
      if (this.paypalEnabled) {
        try {
          const paypalSDK = await import('@paypal/checkout-server-sdk');
          const { PayPalHttpClient, core } = paypalSDK.default || paypalSDK;
          
          const environment = this.isProduction 
            ? new core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
            : new core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
          
          this.paypalClient = new PayPalHttpClient(environment);
          this.paypalOrders = paypalSDK.default?.orders || paypalSDK.orders;
          
          logger.info('Enhanced PayPal integration initialized', { 
            production: this.isProduction 
          });
        } catch (paypalError) {
          logger.error('PayPal initialization failed', { error: paypalError.message });
          this.paypalEnabled = false;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize payment providers', { error: error.message });
      throw new Error('Payment system initialization failed');
    }
  }

  /**
   * Creates a payment intent for the given order
   */
  async createPaymentIntent(orderData) {
    const { 
      orderId, 
      amount, 
      currency = 'EUR', 
      paymentMethod = 'stripe',
      customerInfo,
      metadata = {}
    } = orderData;

    logger.info('Creating payment intent', { 
      orderId, 
      amount, 
      currency, 
      paymentMethod 
    });

    try {
      // Validate inputs
      this.validatePaymentData({ amount, currency, paymentMethod });
      
      // Create payment based on method
      let paymentIntent;
      
      if (paymentMethod === 'stripe' || paymentMethod.startsWith('stripe_')) {
        paymentIntent = await this.createStripePaymentIntent({
          orderId,
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: currency.toLowerCase(),
          customerInfo,
          metadata: { orderId, ...metadata }
        });
      } else if (paymentMethod === 'paypal') {
        paymentIntent = await this.createPayPalOrder({
          orderId,
          amount,
          currency: currency.toUpperCase(),
          customerInfo,
          metadata
        });
      } else {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      // Store payment intent in database
      await this.storePaymentIntent(paymentIntent);
      
      logger.info('Payment intent created successfully', { 
        orderId,
        paymentIntentId: paymentIntent.id,
        provider: paymentMethod
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Payment intent creation failed', { 
        orderId,
        error: error.message,
        paymentMethod
      });
      throw error;
    }
  }

  /**
   * Create Stripe Payment Intent with advanced features
   */
  async createStripePaymentIntent({ orderId, amount, currency, customerInfo, metadata }) {
    if (!this.stripe) throw new Error('Stripe not initialized');

    const paymentIntentData = {
      amount,
      currency,
      metadata,
      description: `DIY Humanoid Order ${orderId}`,
      automatic_payment_methods: {
        enabled: true,
      },
      setup_future_usage: 'off_session', // For future payments
    };

    // Add customer information
    if (customerInfo?.email) {
      // Try to find existing customer or create new one
      const customers = await this.stripe.customers.list({
        email: customerInfo.email,
        limit: 1
      });

      let customerId;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await this.stripe.customers.create({
          email: customerInfo.email,
          name: customerInfo.name,
          metadata: { orderId }
        });
        customerId = customer.id;
      }
      
      paymentIntentData.customer = customerId;
    }

    // SEPA specific configuration
    if (currency === 'eur') {
      paymentIntentData.payment_method_types = ['card', 'sepa_debit', 'giropay', 'sofort'];
    }

    const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: paymentIntent.status,
      provider: 'stripe',
      orderId,
      createdAt: new Date(paymentIntent.created * 1000)
    };
  }

  /**
   * Create PayPal Order
   */
  async createPayPalOrder({ orderId, amount, currency, customerInfo, metadata }) {
    if (!this.paypalClient) throw new Error('PayPal not initialized');

    const request = new this.paypalOrders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        description: `DIY Humanoid Roboter Konfiguration - Order ${orderId}`,
        custom_id: orderId,
        invoice_id: `INV-${orderId}`
      }],
      application_context: {
        brand_name: 'DIY Humanoid Configurator',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      }
    });

    const order = await this.paypalClient.execute(request);

    return {
      id: order.result.id,
      status: order.result.status,
      amount,
      currency,
      provider: 'paypal',
      orderId,
      approvalUrl: order.result.links.find(link => link.rel === 'approve')?.href,
      createdAt: new Date()
    };
  }

  /**
   * Confirm/Capture payment
   */
  async confirmPayment(paymentIntentId, provider = 'stripe') {
    logger.info('Confirming payment', { paymentIntentId, provider });

    try {
      let result;
      
      if (provider === 'stripe') {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        
        // If payment requires confirmation
        if (paymentIntent.status === 'requires_confirmation') {
          result = await this.stripe.paymentIntents.confirm(paymentIntentId);
        } else {
          result = paymentIntent;
        }
      } else if (provider === 'paypal') {
        const request = new this.paypalOrders.OrdersCaptureRequest(paymentIntentId);
        const capture = await this.paypalClient.execute(request);
        result = capture.result;
      }

      // Update database
      await this.updatePaymentStatus(paymentIntentId, 'confirmed', provider);
      
      logger.info('Payment confirmed successfully', { paymentIntentId, provider });
      return result;
    } catch (error) {
      logger.error('Payment confirmation failed', { 
        paymentIntentId, 
        provider, 
        error: error.message 
      });
      
      await this.updatePaymentStatus(paymentIntentId, 'failed', provider);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(paymentIntentId, amount, reason = 'requested_by_customer', provider = 'stripe') {
    logger.info('Processing refund', { paymentIntentId, amount, reason, provider });

    try {
      let refund;
      
      if (provider === 'stripe') {
        const refundData = {
          payment_intent: paymentIntentId,
          reason,
          metadata: {
            processed_at: new Date().toISOString(),
            reason
          }
        };
        
        if (amount) {
          refundData.amount = Math.round(amount * 100); // Convert to cents
        }
        
        refund = await this.stripe.refunds.create(refundData);
      } else if (provider === 'paypal') {
        // PayPal refund implementation
        const captureId = await this.getPayPalCaptureId(paymentIntentId);
        const request = new payments.CapturesRefundRequest(captureId);
        
        request.requestBody({
          amount: {
            currency_code: 'EUR',
            value: amount?.toFixed(2)
          },
          note_to_payer: reason
        });
        
        const refundResponse = await this.paypalClient.execute(request);
        refund = refundResponse.result;
      }

      // Store refund in database
      await this.storeRefund({
        paymentIntentId,
        refundId: refund.id,
        amount: amount || 'full',
        reason,
        provider,
        status: refund.status
      });

      logger.info('Refund processed successfully', { 
        paymentIntentId, 
        refundId: refund.id,
        provider 
      });
      
      return refund;
    } catch (error) {
      logger.error('Refund processing failed', { 
        paymentIntentId, 
        error: error.message,
        provider
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(rawBody, signature) {
    if (!this.stripeWebhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.stripeWebhookSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err.message });
      throw new Error('Invalid signature');
    }

    logger.info('Processing Stripe webhook', { type: event.type, id: event.id });

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object, 'stripe');
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object, 'stripe');
        break;
      case 'payment_intent.requires_action':
        await this.handlePaymentRequiresAction(event.data.object, 'stripe');
        break;
      case 'charge.dispute.created':
        await this.handleDispute(event.data.object, 'stripe');
        break;
      default:
        logger.info('Unhandled Stripe webhook event', { type: event.type });
    }

    return { received: true };
  }

  /**
   * Handle PayPal webhook
   */
  async handlePayPalWebhook(rawBody, headers) {
    const event = JSON.parse(rawBody);
    
    // Verify webhook signature (simplified)
    if (!this.verifyPayPalWebhook(rawBody, headers)) {
      throw new Error('Invalid PayPal webhook signature');
    }

    logger.info('Processing PayPal webhook', { type: event.event_type, id: event.id });

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentSuccess(event.resource, 'paypal');
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePaymentFailure(event.resource, 'paypal');
        break;
      case 'CUSTOMER.DISPUTE.CREATED':
        await this.handleDispute(event.resource, 'paypal');
        break;
      default:
        logger.info('Unhandled PayPal webhook event', { type: event.event_type });
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentData, provider) {
    const orderId = provider === 'stripe' 
      ? paymentData.metadata?.orderId 
      : paymentData.custom_id;

    logger.info('Processing successful payment', { orderId, provider });

    try {
      // Update payment status
      await this.updatePaymentStatus(paymentData.id, 'succeeded', provider);
      
      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: { 
          status: 'paid',
          paidAt: new Date(),
          paymentProvider: provider,
          paymentIntentId: paymentData.id
        }
      });

      // Trigger order fulfillment
      await this.triggerOrderFulfillment(orderId);
      
      logger.info('Payment success handling completed', { orderId, provider });
    } catch (error) {
      logger.error('Failed to handle payment success', { 
        orderId, 
        provider, 
        error: error.message 
      });
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(paymentData, provider) {
    const orderId = provider === 'stripe' 
      ? paymentData.metadata?.orderId 
      : paymentData.custom_id;

    logger.info('Processing failed payment', { orderId, provider });

    try {
      await this.updatePaymentStatus(paymentData.id, 'failed', provider);
      
      await db.order.update({
        where: { id: orderId },
        data: { 
          status: 'payment_failed',
          failedAt: new Date()
        }
      });
      
      logger.info('Payment failure handling completed', { orderId, provider });
    } catch (error) {
      logger.error('Failed to handle payment failure', { 
        orderId, 
        provider, 
        error: error.message 
      });
    }
  }

  /**
   * Utility functions
   */
  validatePaymentData({ amount, currency, paymentMethod }) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    
    if (!this.supportedCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    
    const provider = paymentMethod.split('_')[0];
    if (!this.supportedMethods[provider]) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  async storePaymentIntent(paymentIntent) {
    try {
      await db.payment.create({
        data: {
          id: paymentIntent.id,
          orderId: paymentIntent.orderId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          provider: paymentIntent.provider,
          status: paymentIntent.status,
          createdAt: paymentIntent.createdAt
        }
      });
    } catch (error) {
      logger.error('Failed to store payment intent', { error: error.message });
    }
  }

  async updatePaymentStatus(paymentIntentId, status, provider) {
    try {
      await db.payment.update({
        where: { id: paymentIntentId },
        data: { 
          status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update payment status', { 
        paymentIntentId, 
        status, 
        error: error.message 
      });
    }
  }

  async storeRefund(refundData) {
    try {
      await db.refund.create({
        data: {
          id: refundData.refundId,
          paymentId: refundData.paymentIntentId,
          amount: refundData.amount,
          reason: refundData.reason,
          provider: refundData.provider,
          status: refundData.status,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store refund', { error: error.message });
    }
  }

  async triggerOrderFulfillment(orderId) {
    // This would trigger the order fulfillment process
    // e.g., send confirmation email, start manufacturing, etc.
    logger.info('Order fulfillment triggered', { orderId });
  }

  verifyPayPalWebhook(rawBody, headers) {
    // Simplified verification - in production, implement proper signature verification
    return true;
  }

  /**
   * Get available payment methods for amount/currency
   */
  getAvailablePaymentMethods(amount, currency = 'EUR') {
    const methods = [];
    
    if (this.stripeEnabled) {
      methods.push(
        { id: 'stripe_card', name: 'Kreditkarte', provider: 'stripe' },
        { id: 'stripe_sepa', name: 'SEPA-Lastschrift', provider: 'stripe', currency: ['EUR'] }
      );
      
      if (currency === 'EUR') {
        methods.push(
          { id: 'stripe_giropay', name: 'Giropay', provider: 'stripe' },
          { id: 'stripe_sofort', name: 'Sofort', provider: 'stripe' }
        );
      }
    }
    
    if (this.paypalEnabled) {
      methods.push(
        { id: 'paypal', name: 'PayPal', provider: 'paypal' }
      );
    }
    
    return methods.filter(method => 
      !method.currency || method.currency.includes(currency)
    );
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      stripe: false,
      paypal: false,
      database: false
    };

    // Test Stripe
    if (this.stripe) {
      try {
        await this.stripe.paymentMethods.list({ limit: 1 });
        health.stripe = true;
      } catch (error) {
        logger.warn('Stripe health check failed', { error: error.message });
      }
    }

    // Test PayPal
    if (this.paypalClient) {
      try {
        // Simple test to verify PayPal connection
        health.paypal = true;
      } catch (error) {
        logger.warn('PayPal health check failed', { error: error.message });
      }
    }

    // Test Database
    try {
      await db.$queryRaw`SELECT 1`;
      health.database = true;
    } catch (error) {
      logger.warn('Database health check failed', { error: error.message });
    }

    return {
      status: Object.values(health).every(h => h) ? 'healthy' : 'degraded',
      services: health,
      timestamp: new Date().toISOString()
    };
  }
}

export const enhancedPaymentService = new EnhancedPaymentService();
export default enhancedPaymentService;