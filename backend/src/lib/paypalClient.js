import { PaypalServerSDK } from '@paypal/paypal-server-sdk';
import { logger } from './logger.js';

let paypalClientInstance = null;

/**
 * Initialize PayPal client with environment configuration
 * @returns {PaypalServerSDK} Configured PayPal client instance
 */
export async function paypalClient() {
  if (paypalClientInstance) {
    return paypalClientInstance;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  try {
    const client = new PaypalServerSDK({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      environment: environment === 'production' ? 'production' : 'sandbox',
    });

    paypalClientInstance = client;
    
    logger.info('PayPal client initialized', { 
      environment,
      clientId: clientId.substring(0, 8) + '...' // Log only first 8 chars for security
    });

    return paypalClientInstance;
  } catch (error) {
    logger.error('Failed to initialize PayPal client', { error: error.message });
    throw error;
  }
}

/**
 * Get PayPal environment configuration
 * @returns {Object} Environment settings
 */
export function getPayPalConfig() {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID,
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    baseUrl: process.env.PAYPAL_ENVIRONMENT === 'production' 
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com',
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
  };
}

/**
 * Validate PayPal webhook signature (simplified version)
 * @param {string} payload - Webhook payload
 * @param {Object} headers - Request headers
 * @returns {boolean} Validation result
 */
export function validatePayPalWebhookSignature(payload, headers) {
  // PayPal webhook signature validation is complex and requires additional setup
  // For development, we'll accept all webhooks from PayPal's expected headers
  const requiredHeaders = [
    'paypal-transmission-id',
    'paypal-cert-id',
    'paypal-transmission-sig',
    'paypal-transmission-time'
  ];

  const hasRequiredHeaders = requiredHeaders.every(header => 
    headers[header] || headers[header.toLowerCase()]
  );

  if (!hasRequiredHeaders) {
    logger.warn('PayPal webhook missing required headers', { 
      receivedHeaders: Object.keys(headers),
      requiredHeaders 
    });
    return false;
  }

  // In production, implement full signature verification
  // For now, basic validation
  logger.info('PayPal webhook signature validation passed (simplified)');
  return true;
}

export default paypalClient;