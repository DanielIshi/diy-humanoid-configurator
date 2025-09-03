import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../utils/api';

/**
 * Payment Method Selector Component
 * Allows users to choose between available payment methods
 */
export const PaymentMethodSelector = ({ 
  selectedMethod, 
  onMethodChange,
  className = '' 
}) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentAPI.getPaymentMethods();
      if (response.success) {
        setPaymentMethods(response.data.methods);
        
        // Select first available method if none selected
        if (!selectedMethod && response.data.methods.length > 0) {
          onMethodChange?.(response.data.methods[0].id);
        }
      } else {
        setError('Failed to load payment methods');
      }
    } catch (err) {
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId) => {
    switch (methodId) {
      case 'stripe':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-5 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">💳</span>
            </div>
            <span>Credit Card</span>
          </div>
        );
      case 'paypal':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-5 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">PP</span>
            </div>
            <span>PayPal</span>
          </div>
        );
      default:
        return methodId;
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-2">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-600 mb-2">{error}</div>
        <button
          onClick={fetchPaymentMethods}
          className="text-blue-600 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        No payment methods available
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Choose Payment Method
      </h3>
      
      {paymentMethods.map((method) => (
        <div
          key={method.id}
          className={`
            relative border-2 rounded-lg p-4 cursor-pointer transition-all
            ${selectedMethod === method.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${!method.enabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => method.enabled && onMethodChange?.(method.id)}
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => method.enabled && onMethodChange?.(method.id)}
              disabled={!method.enabled}
              className="sr-only"
            />
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">
                  {getMethodIcon(method.id)}
                </div>
                
                {selectedMethod === method.id && (
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
              
              {method.description && (
                <p className="mt-1 text-sm text-gray-500">
                  {method.description}
                </p>
              )}
            </div>
          </div>
          
          {!method.enabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
              <span className="text-sm text-gray-500 font-medium">
                Currently unavailable
              </span>
            </div>
          )}
        </div>
      ))}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>💳 Credit/Debit cards: Visa, Mastercard, American Express</p>
        <p>🛡️ All payments are secure and encrypted</p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;