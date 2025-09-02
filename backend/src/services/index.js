import OrderService from './orderService.js';
import PaymentService from './paymentService.js';
import ConfigurationService from './configurationService.js';
import notificationService from './notificationService.js';

// Import existing manual service
import { generateManual, getManualById } from './manualService.js';

// Create service instances
const orderService = new OrderService();
const paymentService = new PaymentService();
const configurationService = new ConfigurationService();

export {
  // Service instances
  orderService,
  paymentService,
  configurationService,
  notificationService, // Already instantiated as singleton
  
  // Service classes
  OrderService,
  PaymentService,
  ConfigurationService,
  
  // Existing manual service functions
  generateManual,
  getManualById,
};