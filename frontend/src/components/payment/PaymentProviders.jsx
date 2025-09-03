import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// PayPal configuration
const paypalOptions = {
  'client-id': import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: import.meta.env.VITE_PAYPAL_CURRENCY || 'EUR',
  intent: (import.meta.env.VITE_PAYPAL_INTENT || 'capture').toLowerCase(),
  'data-client-token': 'false',
};

/**
 * Payment Providers Wrapper Component
 * Wraps the app with Stripe and PayPal providers
 */
export const PaymentProviders = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      <PayPalScriptProvider options={paypalOptions}>
        {children}
      </PayPalScriptProvider>
    </Elements>
  );
};

export default PaymentProviders;
