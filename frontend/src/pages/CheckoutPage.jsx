import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PaymentProviders from '../components/payment/PaymentProviders';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';
import CheckoutForm from '../components/payment/CheckoutForm';
import OrderSummary from '../components/payment/OrderSummary';
import { orderAPI } from '../utils/api';

/**
 * Checkout Page Component
 * Main checkout flow with payment processing
 */
export const CheckoutPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('review'); // review, payment, processing, success

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setError('No order ID provided');
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderAPI.getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
        
        // Check if order can be paid
        if (response.data.paymentStatus === 'COMPLETED') {
          navigate(`/order/${orderId}/success`);
          return;
        }
        
        if (response.data.status === 'CANCELLED') {
          setError('This order has been cancelled and cannot be paid.');
          return;
        }
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    setStep('processing');
    
    try {
      // Update order status on success
      await fetchOrder();
      
      // Navigate to success page after a brief delay
      setTimeout(() => {
        navigate(`/order/${orderId}/success`, {
          state: { paymentData }
        });
      }, 2000);
    } catch (err) {
      console.error('Error updating order after payment:', err);
      // Still navigate to success page
      navigate(`/order/${orderId}/success`, {
        state: { paymentData }
      });
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setError(error.message || 'Payment failed. Please try again.');
    setStep('payment');
  };

  const handleContinueToPayment = () => {
    setStep('payment');
    setError(null);
  };

  const handleBackToReview = () => {
    setStep('review');
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Order
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <PaymentProviders>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <button
                      onClick={() => navigate('/orders')}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      Orders
                    </button>
                  </li>
                  <li>
                    <span className="text-gray-400">/</span>
                  </li>
                  <li>
                    <span className="text-gray-900 font-medium">
                      Checkout
                    </span>
                  </li>
                </ol>
              </nav>
              
              <h1 className="text-3xl font-bold text-gray-900 mt-4">
                Checkout
              </h1>
              
              {/* Progress Steps */}
              <div className="mt-6">
                <div className="flex items-center">
                  <div className={`flex items-center ${step === 'review' ? 'text-blue-600' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'review' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                      {step === 'review' ? '1' : '✓'}
                    </div>
                    <span className="ml-2 font-medium">Review Order</span>
                  </div>
                  
                  <div className="flex-1 mx-4 h-0.5 bg-gray-200">
                    <div className={`h-full transition-all duration-300 ${
                      ['payment', 'processing', 'success'].includes(step) ? 'bg-blue-600' : 'bg-gray-200'
                    }`} style={{ width: ['payment', 'processing', 'success'].includes(step) ? '100%' : '0%' }}></div>
                  </div>
                  
                  <div className={`flex items-center ${
                    step === 'payment' ? 'text-blue-600' : 
                    ['processing', 'success'].includes(step) ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'payment' ? 'bg-blue-600 text-white' :
                      ['processing', 'success'].includes(step) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step === 'payment' ? '2' : ['processing', 'success'].includes(step) ? '✓' : '2'}
                    </div>
                    <span className="ml-2 font-medium">Payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {step === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div>
                <OrderSummary order={order} />
                
                <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {user?.name}</p>
                    <p><span className="font-medium">Email:</span> {user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-6">
                <PaymentMethodSelector 
                  selectedMethod={selectedPaymentMethod}
                  onMethodChange={setSelectedPaymentMethod}
                />
                
                <button
                  onClick={handleContinueToPayment}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment Form */}
              <div>
                <div className="bg-white rounded-lg shadow-sm p-2">
                  <button
                    onClick={handleBackToReview}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
                  >
                    ← Back to Review
                  </button>
                  
                  <CheckoutForm
                    order={order}
                    selectedMethod={selectedPaymentMethod}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                </div>
              </div>

              {/* Order Summary (Collapsed) */}
              <div>
                <OrderSummary order={order} />
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Payment
              </h2>
              <p className="text-gray-600">
                Please wait while we confirm your payment...
              </p>
            </div>
          )}
        </div>
      </div>
    </PaymentProviders>
  );
};

export default CheckoutPage;
