/**
 * API Utility Functions
 * Centralized API calls for the frontend application
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Base API request function with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Handle different content types
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data.message || data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Payment API Functions
 */
export const paymentAPI = {
  /**
   * Get available payment methods
   * @returns {Promise<Object>} Available payment methods
   */
  async getPaymentMethods() {
    return apiRequest('/payment/methods');
  },

  /**
   * Create payment intent
   * @param {string} orderId - Order ID
   * @param {string} paymentMethod - Payment method (stripe, paypal)
   * @returns {Promise<Object>} Payment intent details
   */
  async createPaymentIntent(orderId, paymentMethod = 'stripe') {
    return apiRequest('/payment/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentMethod }),
    });
  },

  /**
   * Confirm payment
   * @param {string} paymentId - Payment ID
   * @param {string} paymentMethod - Payment method
   * @returns {Promise<Object>} Payment confirmation
   */
  async confirmPayment(paymentId, paymentMethod = 'stripe') {
    return apiRequest('/payment/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentId, paymentMethod }),
    });
  },

  /**
   * Process refund (Admin only)
   * @param {string} orderId - Order ID
   * @param {number} amount - Refund amount (optional, full refund if not specified)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund details
   */
  async processRefund(orderId, amount = null, reason = '') {
    return apiRequest('/payment/refund', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount, reason }),
    });
  },

  /**
   * Get payment provider status (Admin only)
   * @returns {Promise<Object>} Provider status
   */
  async getProviderStatus() {
    return apiRequest('/payment/status');
  },
};

/**
 * Order API Functions
 */
export const orderAPI = {
  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    return apiRequest(`/orders/${orderId}`);
  },

  /**
   * Get user's orders
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Orders list
   */
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';
    return apiRequest(endpoint);
  },

  /**
   * Create new order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createOrder(orderData) {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, status) {
    return apiRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancelled order
   */
  async cancelOrder(orderId) {
    return apiRequest(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
};

/**
 * Auth API Functions
 */
export const authAPI = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with token
   */
  async login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Register user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    return apiRequest('/auth/profile');
  },

  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(userData) {
    return apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Logout user
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
};

/**
 * Configuration API Functions
 */
export const configAPI = {
  /**
   * Get all configurations
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Configurations list
   */
  async getConfigurations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/configurations?${queryString}` : '/configurations';
    return apiRequest(endpoint);
  },

  /**
   * Get configuration by ID
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} Configuration details
   */
  async getConfiguration(configId) {
    return apiRequest(`/configurations/${configId}`);
  },

  /**
   * Create new configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Created configuration
   */
  async createConfiguration(configData) {
    return apiRequest('/configurations', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  },

  /**
   * Update configuration
   * @param {string} configId - Configuration ID
   * @param {Object} configData - Updated configuration data
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfiguration(configId, configData) {
    return apiRequest(`/configurations/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },

  /**
   * Delete configuration
   * @param {string} configId - Configuration ID
   * @returns {Promise<Object>} Delete response
   */
  async deleteConfiguration(configId) {
    return apiRequest(`/configurations/${configId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Upload file utility
 * @param {string} endpoint - Upload endpoint
 * @param {File} file - File to upload
 * @param {Object} additionalData - Additional form data
 * @returns {Promise<Object>} Upload response
 */
export async function uploadFile(endpoint, file, additionalData = {}) {
  const formData = new FormData();
  formData.append('file', file);
  
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });

  const token = localStorage.getItem('token');
  
  return apiRequest(endpoint, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });
}

/**
 * Download file utility
 * @param {string} endpoint - Download endpoint
 * @param {string} filename - Desired filename
 */
export async function downloadFile(endpoint, filename) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

export default {
  paymentAPI,
  orderAPI,
  authAPI,
  configAPI,
  uploadFile,
  downloadFile,
};