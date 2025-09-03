/**
 * Compliance utilities for GDPR, order history, and legal compliance
 * Handles data retention, consent management, and audit trails
 */

// Data retention periods (in days)
export const RETENTION_PERIODS = {
  ORDER_HISTORY: 2555, // 7 years for tax compliance
  ANALYTICS_DATA: 1095, // 3 years for business analytics
  COOKIE_CONSENT: 365, // 1 year for cookie consent
  ERROR_LOGS: 90, // 3 months for technical logs
  USER_SESSIONS: 30, // 1 month for session data
  MARKETING_DATA: 730 // 2 years for marketing
};

// Legal basis for data processing (GDPR Article 6)
export const LEGAL_BASIS = {
  CONSENT: 'consent', // Article 6(1)(a) - consent
  CONTRACT: 'contract', // Article 6(1)(b) - contract performance
  LEGAL_OBLIGATION: 'legal_obligation', // Article 6(1)(c) - legal obligation
  VITAL_INTERESTS: 'vital_interests', // Article 6(1)(d) - vital interests
  PUBLIC_TASK: 'public_task', // Article 6(1)(e) - public task
  LEGITIMATE_INTERESTS: 'legitimate_interests' // Article 6(1)(f) - legitimate interests
};

/**
 * Order history management with GDPR compliance
 */
export class OrderHistoryManager {
  constructor() {
    this.storageKey = 'diy_order_history';
    this.maxOrders = 100; // Limit to prevent excessive storage
  }

  /**
   * Creates a new order record with compliance metadata
   * @param {Object} orderData - Order information
   * @param {string} legalBasis - Legal basis for processing
   * @returns {Object} Order record with metadata
   */
  createOrderRecord(orderData, legalBasis = LEGAL_BASIS.CONTRACT) {
    const record = {
      id: this.generateOrderId(),
      timestamp: new Date().toISOString(),
      data: orderData,
      compliance: {
        legalBasis: legalBasis,
        consentVersion: this.getCurrentConsentVersion(),
        retentionUntil: this.calculateRetentionDate(RETENTION_PERIODS.ORDER_HISTORY),
        dataSubject: {
          ipAddress: this.hashIP(orderData.customerIP || ''),
          userAgent: navigator.userAgent,
          language: navigator.language
        },
        processing: {
          purpose: 'order_fulfillment',
          categories: ['transaction_data', 'customer_data', 'product_data'],
          recipients: ['internal_fulfillment', 'payment_processor']
        }
      },
      status: 'active'
    };

    this.saveOrderRecord(record);
    this.cleanupExpiredOrders();
    
    return record;
  }

  /**
   * Retrieves order history with privacy filtering
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered order records
   */
  getOrderHistory(filters = {}) {
    try {
      const history = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      let filtered = history.filter(order => order.status === 'active');

      // Apply date filters
      if (filters.from) {
        const fromDate = new Date(filters.from);
        filtered = filtered.filter(order => new Date(order.timestamp) >= fromDate);
      }

      if (filters.to) {
        const toDate = new Date(filters.to);
        filtered = filtered.filter(order => new Date(order.timestamp) <= toDate);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return filtered.slice(0, filters.limit || 50);
    } catch (error) {
      console.error('Error retrieving order history:', error);
      return [];
    }
  }

  /**
   * Anonymizes an order record (GDPR right to erasure)
   * @param {string} orderId - Order ID to anonymize
   * @returns {boolean} Success status
   */
  anonymizeOrder(orderId) {
    try {
      const history = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const orderIndex = history.findIndex(order => order.id === orderId);

      if (orderIndex === -1) {
        return false;
      }

      // Anonymize personal data while keeping business data
      history[orderIndex].data = this.anonymizeOrderData(history[orderIndex].data);
      history[orderIndex].status = 'anonymized';
      history[orderIndex].compliance.anonymizedAt = new Date().toISOString();

      localStorage.setItem(this.storageKey, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Error anonymizing order:', error);
      return false;
    }
  }

  /**
   * Generates audit trail for data processing activities
   * @returns {Object} Audit trail summary
   */
  generateAuditTrail() {
    const history = this.getOrderHistory();
    const auditTrail = {
      generatedAt: new Date().toISOString(),
      totalOrders: history.length,
      retentionCompliance: this.checkRetentionCompliance(),
      legalBasisBreakdown: this.getLegalBasisBreakdown(history),
      dataCategories: this.getDataCategoriesBreakdown(history),
      anonymizedOrders: history.filter(order => order.status === 'anonymized').length
    };

    return auditTrail;
  }

  // Private methods
  generateOrderId() {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentConsentVersion() {
    try {
      const consent = JSON.parse(localStorage.getItem('diy_consent_preferences') || '{}');
      return consent.version || '1.0';
    } catch {
      return '1.0';
    }
  }

  calculateRetentionDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  hashIP(ip) {
    // Simple hash for IP addresses (GDPR compliance)
    if (!ip) return 'unknown';
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hashed_${Math.abs(hash)}`;
  }

  saveOrderRecord(record) {
    try {
      const history = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      history.push(record);
      
      // Maintain maximum order limit
      if (history.length > this.maxOrders) {
        history.splice(0, history.length - this.maxOrders);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving order record:', error);
    }
  }

  cleanupExpiredOrders() {
    try {
      const history = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const now = new Date();
      
      const activeHistory = history.filter(order => {
        const retentionDate = new Date(order.compliance?.retentionUntil);
        return retentionDate > now;
      });

      if (activeHistory.length !== history.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(activeHistory));
        console.log(`Cleaned up ${history.length - activeHistory.length} expired orders`);
      }
    } catch (error) {
      console.error('Error cleaning up expired orders:', error);
    }
  }

  anonymizeOrderData(orderData) {
    const anonymized = { ...orderData };
    
    // Remove or hash personal identifiers
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.customerName;
    delete anonymized.address;
    delete anonymized.customerIP;
    
    // Keep business-relevant data
    // anonymized.items, anonymized.total, etc. remain

    return anonymized;
  }

  checkRetentionCompliance() {
    const history = this.getOrderHistory();
    const now = new Date();
    
    return {
      compliant: history.every(order => {
        const retentionDate = new Date(order.compliance?.retentionUntil || now);
        return retentionDate > now;
      }),
      nextCleanup: this.getNextCleanupDate(history)
    };
  }

  getNextCleanupDate(history) {
    const retentionDates = history
      .map(order => new Date(order.compliance?.retentionUntil))
      .filter(date => !isNaN(date))
      .sort((a, b) => a - b);
    
    return retentionDates.length > 0 ? retentionDates[0].toISOString() : null;
  }

  getLegalBasisBreakdown(history) {
    const breakdown = {};
    history.forEach(order => {
      const basis = order.compliance?.legalBasis || 'unknown';
      breakdown[basis] = (breakdown[basis] || 0) + 1;
    });
    return breakdown;
  }

  getDataCategoriesBreakdown(history) {
    const categories = new Set();
    history.forEach(order => {
      const orderCategories = order.compliance?.processing?.categories || [];
      orderCategories.forEach(category => categories.add(category));
    });
    return Array.from(categories);
  }
}

/**
 * Data Subject Rights Manager
 * Handles GDPR rights requests
 */
export class DataSubjectRightsManager {
  constructor() {
    this.requestsKey = 'diy_dsr_requests';
  }

  /**
   * Creates a data subject rights request
   * @param {string} type - Request type (access, rectification, erasure, etc.)
   * @param {Object} requestData - Request details
   * @returns {Object} Request record
   */
  createRequest(type, requestData) {
    const request = {
      id: this.generateRequestId(),
      type: type,
      timestamp: new Date().toISOString(),
      status: 'pending',
      data: requestData,
      processingDeadline: this.calculateDeadline(type)
    };

    this.saveRequest(request);
    return request;
  }

  /**
   * Processes data export request (GDPR Article 15)
   * @param {string} identifier - User identifier
   * @returns {Object} Exported data
   */
  exportUserData(identifier) {
    const orderManager = new OrderHistoryManager();
    const orders = orderManager.getOrderHistory();
    const userOrders = orders.filter(order => 
      this.matchesIdentifier(order, identifier)
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      orders: userOrders.map(order => ({
        id: order.id,
        timestamp: order.timestamp,
        items: order.data.items,
        total: order.data.total,
        status: order.status
      })),
      consent: this.getConsentHistory(identifier),
      metadata: {
        retention: 'Data will be retained according to our retention policy',
        sources: ['order_system', 'analytics', 'preferences'],
        processors: ['internal_system', 'payment_processor']
      }
    };

    this.createRequest('access', { identifier, export: exportData });
    return exportData;
  }

  /**
   * Processes data deletion request (GDPR Article 17)
   * @param {string} identifier - User identifier
   * @returns {boolean} Success status
   */
  deleteUserData(identifier) {
    try {
      const orderManager = new OrderHistoryManager();
      const orders = orderManager.getOrderHistory();
      
      // Anonymize matching orders
      orders.forEach(order => {
        if (this.matchesIdentifier(order, identifier)) {
          orderManager.anonymizeOrder(order.id);
        }
      });

      // Remove consent data
      this.removeConsentData(identifier);

      this.createRequest('erasure', { 
        identifier, 
        processed: true,
        processedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }

  // Private methods
  generateRequestId() {
    return `DSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateDeadline(type) {
    const now = new Date();
    const days = type === 'access' ? 30 : 30; // GDPR: 1 month deadline
    now.setDate(now.getDate() + days);
    return now.toISOString();
  }

  matchesIdentifier(order, identifier) {
    const orderData = order.data;
    return (
      orderData.email === identifier ||
      orderData.phone === identifier ||
      order.id === identifier
    );
  }

  getConsentHistory(identifier) {
    // Implementation would retrieve consent history for the identifier
    // This is a placeholder for the actual implementation
    return {
      cookieConsent: localStorage.getItem('diy_consent_preferences'),
      termsAcceptance: localStorage.getItem('diy_terms_acceptance')
    };
  }

  removeConsentData(identifier) {
    // Implementation would remove consent data for the identifier
    // This is a placeholder for the actual implementation
    localStorage.removeItem('diy_consent_preferences');
    localStorage.removeItem('diy_terms_acceptance');
  }

  saveRequest(request) {
    try {
      const requests = JSON.parse(localStorage.getItem(this.requestsKey) || '[]');
      requests.push(request);
      localStorage.setItem(this.requestsKey, JSON.stringify(requests));
    } catch (error) {
      console.error('Error saving DSR request:', error);
    }
  }
}

/**
 * Compliance utilities
 */
export const ComplianceUtils = {
  OrderHistoryManager,
  DataSubjectRightsManager,
  RETENTION_PERIODS,
  LEGAL_BASIS,

  /**
   * Validates if data processing is compliant
   * @param {Object} processingData - Data processing information
   * @returns {Object} Compliance validation result
   */
  validateCompliance(processingData) {
    const validation = {
      valid: true,
      issues: [],
      recommendations: []
    };

    // Check legal basis
    if (!processingData.legalBasis || !Object.values(LEGAL_BASIS).includes(processingData.legalBasis)) {
      validation.valid = false;
      validation.issues.push('Missing or invalid legal basis');
    }

    // Check retention period
    if (!processingData.retentionUntil || new Date(processingData.retentionUntil) <= new Date()) {
      validation.issues.push('Invalid or expired retention period');
    }

    // Check data categories
    if (!processingData.categories || processingData.categories.length === 0) {
      validation.recommendations.push('Specify data categories for better compliance tracking');
    }

    return validation;
  },

  /**
   * Generates compliance report
   * @returns {Object} Comprehensive compliance report
   */
  generateComplianceReport() {
    const orderManager = new OrderHistoryManager();
    const rightsManager = new DataSubjectRightsManager();
    
    return {
      generatedAt: new Date().toISOString(),
      orderHistory: orderManager.generateAuditTrail(),
      dataSubjectRights: {
        // Would include DSR request statistics
        totalRequests: 0,
        pendingRequests: 0,
        processingTime: 'N/A'
      },
      retention: orderManager.checkRetentionCompliance(),
      consent: {
        // Would include consent statistics
        totalConsents: 0,
        withdrawnConsents: 0
      }
    };
  }
};

export default ComplianceUtils;