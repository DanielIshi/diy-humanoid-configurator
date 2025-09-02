import { logger } from '../lib/logger.js';

class NotificationService {
  constructor() {
    this.emailEnabled = !!process.env.SMTP_HOST;
    this.webhookEnabled = !!process.env.WEBHOOK_URL;
    
    this.initializeProviders();
  }

  async initializeProviders() {
    // Email provider initialization (nodemailer)
    if (this.emailEnabled) {
      try {
        const nodemailer = await import('nodemailer');
        this.nodemailer = nodemailer.default;
        this.emailTransporter = this.nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        logger.info('Email notification provider initialized');
      } catch (error) {
        logger.error('Failed to initialize email provider', { error: error.message });
        this.emailEnabled = false;
      }
    }

    // Webhook initialization
    if (this.webhookEnabled) {
      this.webhookUrl = process.env.WEBHOOK_URL;
      logger.info('Webhook notifications enabled');
    }
  }

  async sendOrderConfirmation(order, items = []) {
    try {
      logger.info('Sending order confirmation', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        template: 'orderConfirmation',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          total: order.total,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
          estimatedDelivery: order.estimatedDelivery,
        },
      };

      const webhookData = {
        event: 'order.confirmed',
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        customerEmail: order.customerInfo?.email,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);

      logger.info('Order confirmation sent', { orderId: order.id });
    } catch (error) {
      logger.error('Failed to send order confirmation', { 
        orderId: order.id, 
        error: error.message 
      });
      // Don't throw - notification failures shouldn't break order processing
    }
  }

  async sendOrderProcessingNotification(order) {
    try {
      logger.info('Sending order processing notification', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Order Processing - ${order.orderNumber}`,
        template: 'orderProcessing',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          message: 'Your order is now being processed and will be shipped soon.',
        },
      };

      const webhookData = {
        event: 'order.processing',
        orderId: order.id,
        orderNumber: order.orderNumber,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send processing notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendShippingNotification(order, shippingInfo = {}) {
    try {
      logger.info('Sending shipping notification', { orderId: order.id });

      const { trackingNumber, shippingMethod, estimatedDelivery } = shippingInfo;

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Order Shipped - ${order.orderNumber}`,
        template: 'orderShipped',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          trackingNumber,
          shippingMethod,
          estimatedDelivery,
          trackingUrl: this.generateTrackingUrl(trackingNumber, shippingMethod),
        },
      };

      const webhookData = {
        event: 'order.shipped',
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingNumber,
        shippingMethod,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send shipping notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendDeliveryNotification(order) {
    try {
      logger.info('Sending delivery notification', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Order Delivered - ${order.orderNumber}`,
        template: 'orderDelivered',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          message: 'Your order has been delivered! Check your email for assembly instructions.',
          manualUrl: `${process.env.APP_URL}/orders/${order.id}/manual`,
        },
      };

      const webhookData = {
        event: 'order.delivered',
        orderId: order.id,
        orderNumber: order.orderNumber,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send delivery notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendCancellationNotification(order, reason = '') {
    try {
      logger.info('Sending cancellation notification', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Order Cancelled - ${order.orderNumber}`,
        template: 'orderCancelled',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          reason,
          total: order.total,
          refundMessage: 'A refund will be processed within 3-5 business days.',
        },
      };

      const webhookData = {
        event: 'order.cancelled',
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send cancellation notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendPaymentConfirmation(order, paymentData) {
    try {
      logger.info('Sending payment confirmation', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Payment Confirmed - ${order.orderNumber}`,
        template: 'paymentConfirmed',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          amount: paymentData.amount,
          paymentMethod: paymentData.provider,
          paymentId: paymentData.paymentId,
        },
      };

      const webhookData = {
        event: 'payment.confirmed',
        orderId: order.id,
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send payment confirmation', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendRefundNotification(order) {
    try {
      logger.info('Sending refund notification', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Refund Processed - ${order.orderNumber}`,
        template: 'refundProcessed',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          amount: order.total,
          processingMessage: 'Your refund has been processed and should appear in your account within 3-5 business days.',
        },
      };

      const webhookData = {
        event: 'order.refunded',
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send refund notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendManualReadyNotification(order, manual) {
    try {
      logger.info('Sending manual ready notification', { orderId: order.id });

      const emailData = {
        to: order.customerInfo?.email || order.user?.email,
        subject: `Assembly Manual Ready - ${order.orderNumber}`,
        template: 'manualReady',
        data: {
          orderNumber: order.orderNumber,
          customerName: order.customerInfo?.name || order.user?.name,
          manualTitle: manual.title,
          manualUrl: `${process.env.APP_URL}/orders/${order.id}/manual`,
          downloadUrl: `${process.env.APP_URL}/api/manuals/${manual.id}/download`,
        },
      };

      const webhookData = {
        event: 'manual.ready',
        orderId: order.id,
        manualId: manual.id,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send manual notification', { 
        orderId: order.id, 
        error: error.message 
      });
    }
  }

  async sendAdminAlert(alertType, data) {
    try {
      logger.info('Sending admin alert', { alertType });

      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) {
        logger.warn('Admin email not configured for alerts');
        return;
      }

      const emailData = {
        to: adminEmail,
        subject: `Admin Alert: ${alertType}`,
        template: 'adminAlert',
        data: {
          alertType,
          timestamp: new Date(),
          data,
        },
      };

      const webhookData = {
        event: 'admin.alert',
        alertType,
        data,
      };

      await Promise.all([
        this.sendEmail(emailData),
        this.sendWebhook(webhookData),
      ]);
    } catch (error) {
      logger.error('Failed to send admin alert', { 
        alertType, 
        error: error.message 
      });
    }
  }

  async sendEmail(emailData) {
    if (!this.emailEnabled) {
      logger.debug('Email not enabled, skipping email send');
      return;
    }

    try {
      const { to, subject, template, data } = emailData;

      // For now, send plain text emails
      // TODO: Implement HTML templates
      const textContent = this.generateEmailText(template, data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@diyhumanoid.com',
        to,
        subject,
        text: textContent,
        // html: await this.renderTemplate(template, data), // TODO: Add HTML templates
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
    } catch (error) {
      logger.error('Failed to send email', { 
        to: emailData.to, 
        error: error.message 
      });
    }
  }

  async sendWebhook(webhookData) {
    if (!this.webhookEnabled) {
      logger.debug('Webhooks not enabled, skipping webhook send');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DIY-Humanoid-Configurator/1.0',
        },
        body: JSON.stringify({
          ...webhookData,
          timestamp: new Date(),
        }),
      });

      if (response.ok) {
        logger.info('Webhook sent successfully', { event: webhookData.event });
      } else {
        logger.error('Webhook failed', { 
          event: webhookData.event, 
          status: response.status 
        });
      }
    } catch (error) {
      logger.error('Failed to send webhook', { 
        event: webhookData.event, 
        error: error.message 
      });
    }
  }

  generateEmailText(template, data) {
    // Simple text template generation
    switch (template) {
      case 'orderConfirmation':
        return `
Dear ${data.customerName},

Thank you for your order! Your order ${data.orderNumber} has been confirmed.

Order Details:
${data.items.map(item => `- ${item.name} x${item.quantity}: $${item.subtotal.toFixed(2)}`).join('\n')}

Total: $${data.total.toFixed(2)}

${data.estimatedDelivery ? `Estimated Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString()}` : ''}

Best regards,
DIY Humanoid Team
        `.trim();

      case 'orderProcessing':
        return `
Dear ${data.customerName},

Your order ${data.orderNumber} is now being processed.

${data.message}

Best regards,
DIY Humanoid Team
        `.trim();

      case 'orderShipped':
        return `
Dear ${data.customerName},

Great news! Your order ${data.orderNumber} has been shipped.

${data.trackingNumber ? `Tracking Number: ${data.trackingNumber}` : ''}
${data.shippingMethod ? `Shipping Method: ${data.shippingMethod}` : ''}
${data.trackingUrl ? `Track your package: ${data.trackingUrl}` : ''}

Best regards,
DIY Humanoid Team
        `.trim();

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  generateTrackingUrl(trackingNumber, shippingMethod) {
    if (!trackingNumber) return null;

    // Generate tracking URLs based on shipping method
    switch (shippingMethod?.toLowerCase()) {
      case 'ups':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
      case 'usps':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      case 'dhl':
        return `https://www.dhl.com/track?tracking-id=${trackingNumber}`;
      default:
        return null;
    }
  }

  getNotificationStatus() {
    return {
      email: {
        enabled: this.emailEnabled,
        configured: !!process.env.SMTP_HOST,
      },
      webhook: {
        enabled: this.webhookEnabled,
        configured: !!process.env.WEBHOOK_URL,
      },
    };
  }
}

export default new NotificationService();