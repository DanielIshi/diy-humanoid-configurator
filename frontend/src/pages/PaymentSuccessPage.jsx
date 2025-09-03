import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { orderAPI } from '../utils/api';

/**
 * Payment Success Page
 * Displayed after successful payment completion
 */
export const PaymentSuccessPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paymentData = location.state?.paymentData;

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(price || 0);
  };

  const getPaymentMethodDisplay = (provider) => {
    switch (provider) {
      case 'stripe':
        return '💳 Credit Card';
      case 'paypal':
        return '💙 PayPal';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-400 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-4xl font-bold mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl opacity-90">
            Thank you for your order. Your payment has been processed successfully.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error ? (
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => navigate('/orders')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Order Confirmation */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Confirmation
                </h2>
                <p className="text-gray-600 mt-1">
                  Order #{orderId}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Payment Details */}
                {paymentData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">
                      Payment Confirmed
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-600 font-medium">Amount:</span>
                        <span className="ml-2 text-gray-900">
                          {formatPrice(paymentData.amount, paymentData.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Method:</span>
                        <span className="ml-2 text-gray-900">
                          {getPaymentMethodDisplay(paymentData.provider)}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Transaction ID:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">
                          {paymentData.paymentId}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-600 font-medium">Date:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date().toLocaleString('de-DE')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                {order && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Order Details</h3>
                    
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {item.name || item.title || 'Item'}
                              </h4>
                              {item.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="text-sm text-gray-500 mt-1">
                                Quantity: {item.quantity || 1}
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <div className="font-medium text-gray-900">
                                {formatPrice(item.totalPrice || item.price || 0)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                        Order details not available
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Paid:</span>
                        <span className="text-green-600">
                          {order.totalPrice ? formatPrice(order.totalPrice) : 
                           paymentData ? formatPrice(paymentData.amount, paymentData.currency) : 
                           'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                What's Next?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Confirmation Email</h4>
                    <p className="text-sm text-gray-600">
                      You'll receive a detailed confirmation email shortly with your order details and receipt.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Processing</h4>
                    <p className="text-sm text-gray-600">
                      Your order will be processed and prepared for manual generation within 1-2 business days.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Manual Delivery</h4>
                    <p className="text-sm text-gray-600">
                      You'll receive your detailed assembly manual and parts list via email once ready.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/orders"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-center transition-colors"
              >
                View All Orders
              </Link>
              
              <Link
                to="/configurator"
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium text-center transition-colors"
              >
                Start New Configuration
              </Link>
              
              <Link
                to="/"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-8 py-3 rounded-lg font-medium text-center transition-colors"
              >
                Back to Home
              </Link>
            </div>

            {/* Support */}
            <div className="text-center text-sm text-gray-500">
              <p>
                Need help? Contact our support team at{' '}
                <a href="mailto:support@diy-humanoid.com" className="text-blue-600 hover:text-blue-700">
                  support@diy-humanoid.com
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
