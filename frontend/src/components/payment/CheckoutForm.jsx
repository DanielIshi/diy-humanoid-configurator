import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../utils/api';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

/**
 * Checkout Form Component
 * Handles both Stripe and PayPal payments
 */
export const CheckoutForm = ({ 
  order, 
  onPaymentSuccess, 
  onPaymentError,
  selectedMethod = 'stripe' 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [error, setError] = useState(null);

  // Create payment intent when component mounts
  useEffect(() => {
    if (selectedMethod === 'stripe' && order) {
      createPaymentIntent();
    }
  }, [selectedMethod, order]);

  const createPaymentIntent = async () => {
    try {
      setError(null);
      const response = await paymentAPI.createPaymentIntent(order.id, 'stripe');
      if (response.success) {
        setPaymentIntent(response.data);
      } else {
        setError('Failed to create payment intent');
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
    }
  };

  const handleStripeSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const card = elements.getElement(CardElement);
    
    try {
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.clientSecret,
        {
          payment_method: {
            card: card,
            billing_details: {
              name: user?.name || 'Customer',
              email: user?.email,
            },
          },
        }
      );

      if (error) {
        setError(error.message);
        onPaymentError?.(error);
      } else {
        // Payment succeeded
        onPaymentSuccess?.({
          paymentId: confirmedPayment.id,
          amount: confirmedPayment.amount / 100,
          currency: confirmedPayment.currency,
          provider: 'stripe',
        });
      }
    } catch (err) {
      setError(err.message);
      onPaymentError?.(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const createPayPalOrder = async () => {
    try {
      setError(null);
      const response = await paymentAPI.createPaymentIntent(order.id, 'paypal');
      if (response.success) {
        return response.data.paymentId;
      } else {
        throw new Error('Failed to create PayPal order');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const onPayPalApprove = async (data) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Confirm payment on backend
      const response = await paymentAPI.confirmPayment(data.orderID, 'paypal');
      
      if (response.success && response.data.status === 'succeeded') {
        onPaymentSuccess?.({
          paymentId: data.orderID,
          amount: response.data.amount,
          currency: response.data.currency,
          provider: 'paypal',
        });
      } else {
        throw new Error('Payment confirmation failed');
      }
    } catch (err) {
      setError(err.message);
      onPaymentError?.(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onPayPalError = (err) => {
    setError('PayPal payment failed');
    onPaymentError?.(err);
  };

  if (!order) {
    return <div className="text-center py-4">No order data available</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Complete Payment</h3>
        <div className="text-gray-600">
          <p>Order #{order.id}</p>
          <p className="text-2xl font-bold text-blue-600">
            €{order.totalPrice?.toFixed(2)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {selectedMethod === 'stripe' && (
        <form onSubmit={handleStripeSubmit} className="space-y-4">
          <div className="p-3 border border-gray-300 rounded">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          
          <button
            type="submit"
            disabled={!stripe || isProcessing || !paymentIntent}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              isProcessing || !stripe || !paymentIntent
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              `Pay €${order.totalPrice?.toFixed(2)}`
            )}
          </button>
        </form>
      )}

      {selectedMethod === 'paypal' && (
        <div className="space-y-4">
          <PayPalButtons
            createOrder={createPayPalOrder}
            onApprove={onPayPalApprove}
            onError={onPayPalError}
            disabled={isProcessing}
            style={{
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'pay',
            }}
          />
          
          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              Processing PayPal payment...
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p className="mt-1">Powered by Stripe and PayPal</p>
      </div>
    </div>
  );
};

export default CheckoutForm;