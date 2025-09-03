import React from 'react';

/**
 * Order Summary Component
 * Displays order details before payment
 */
export const OrderSummary = ({ order, className = '' }) => {
  if (!order) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="text-gray-500">No order data available</div>
      </div>
    );
  }

  const {
    id,
    items = [],
    subtotal,
    tax,
    shipping,
    totalPrice,
    currency = 'EUR',
    status
  } = order;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(price || 0);
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Order Summary
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Order #{id}</span>
            {status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="p-4 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {item.name || item.title || 'Item'}
                </h4>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                  <span>Qty: {item.quantity || 1}</span>
                  {item.unitPrice && (
                    <span>@ {formatPrice(item.unitPrice)}</span>
                  )}
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="font-medium text-gray-900">
                  {formatPrice(item.totalPrice || item.price || 0)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center py-4">
            No items in this order
          </div>
        )}
      </div>

      {/* Pricing Breakdown */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {subtotal !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatPrice(subtotal)}</span>
          </div>
        )}
        
        {tax !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900">{formatPrice(tax)}</span>
          </div>
        )}
        
        {shipping !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {shipping === 0 ? 'Shipping (Free)' : 'Shipping'}
            </span>
            <span className="text-gray-900">{formatPrice(shipping)}</span>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="p-4 bg-gray-50 rounded-b-lg">
        <div className="text-xs text-gray-500 space-y-1">
          <p>🔒 Secure payment processing</p>
          <p>📧 Order confirmation will be sent to your email</p>
          <p>📦 Estimated delivery: 3-5 business days</p>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;