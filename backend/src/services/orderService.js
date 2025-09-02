import { OrderRepository, ConfigurationRepository, ComponentRepository } from '../repositories/index.js';
import { logger } from '../lib/logger.js';
import notificationService from './notificationService.js';

class OrderService {
  constructor() {
    this.orderRepository = new OrderRepository();
    this.configurationRepository = new ConfigurationRepository();
    this.componentRepository = new ComponentRepository();
  }

  async createOrder(orderData) {
    try {
      const { items, customerInfo, paymentMethod, configurationId, userId } = orderData;
      
      logger.info('Creating new order', { 
        customerEmail: customerInfo?.email,
        configurationId,
        itemCount: items?.length 
      });

      // Validate items and calculate total
      const validatedItems = await this.validateOrderItems(items);
      const total = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // If order is based on a configuration, validate it
      if (configurationId) {
        await this.validateConfiguration(configurationId);
      }

      const finalOrderData = {
        total,
        customerInfo,
        paymentMethod,
        userId,
        configurationId,
      };

      const result = await this.orderRepository.createOrderWithItems(
        finalOrderData,
        validatedItems
      );

      // Send order confirmation
      await notificationService.sendOrderConfirmation(result.order, result.items);

      logger.info('Order created successfully', { orderId: result.order.id });
      
      return result;
    } catch (error) {
      logger.error('Failed to create order', { error: error.message });
      throw error;
    }
  }

  async validateOrderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const validatedItems = [];

    for (const item of items) {
      // Check if product exists and is available
      const product = await this.componentRepository.findById(item.productId);
      
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (product.availability !== 'in-stock') {
        throw new Error(`Product ${product.name} is not available`);
      }

      // Validate price (prevent price manipulation)
      if (Math.abs(item.price - product.price) > 0.01) {
        logger.warn('Price mismatch detected', {
          productId: item.productId,
          submittedPrice: item.price,
          actualPrice: product.price
        });
        item.price = product.price; // Use actual price
      }

      validatedItems.push({
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        productId: item.productId,
        options: item.options,
      });
    }

    return validatedItems;
  }

  async validateConfiguration(configurationId) {
    const validation = await this.configurationRepository.validateConfiguration(configurationId);
    
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    return validation;
  }

  async updateOrderStatus(orderId, newStatus, metadata = {}) {
    try {
      logger.info('Updating order status', { orderId, newStatus });

      const order = await this.orderRepository.updateStatus(orderId, newStatus);

      // Trigger status-specific actions
      await this.handleStatusChange(order, newStatus, metadata);

      return order;
    } catch (error) {
      logger.error('Failed to update order status', { 
        orderId, 
        newStatus, 
        error: error.message 
      });
      throw error;
    }
  }

  async handleStatusChange(order, newStatus, metadata) {
    switch (newStatus) {
      case 'PROCESSING':
        await notificationService.sendOrderProcessingNotification(order);
        // TODO: Trigger inventory reservation
        break;
        
      case 'SHIPPED':
        if (metadata.trackingNumber) {
          await this.orderRepository.updateTracking(
            order.id,
            metadata.trackingNumber,
            metadata.shippingMethod,
            metadata.estimatedDelivery
          );
        }
        await notificationService.sendShippingNotification(order, metadata);
        break;
        
      case 'DELIVERED':
        await notificationService.sendDeliveryNotification(order);
        // TODO: Trigger manual generation if not already done
        break;
        
      case 'CANCELLED':
        await this.handleOrderCancellation(order, metadata.reason);
        break;
        
      case 'REFUNDED':
        await notificationService.sendRefundNotification(order);
        break;
    }
  }

  async handleOrderCancellation(order, reason) {
    logger.info('Processing order cancellation', { orderId: order.id, reason });
    
    // TODO: Release inventory
    // TODO: Process refund if payment was completed
    
    await notificationService.sendCancellationNotification(order, reason);
  }

  async getOrderStatistics(dateRange = {}) {
    try {
      const { dateFrom, dateTo } = dateRange;
      
      const statistics = await this.orderRepository.getOrderStatistics(
        dateFrom ? new Date(dateFrom) : null,
        dateTo ? new Date(dateTo) : null
      );

      // Calculate additional metrics
      const recentOrders = await this.orderRepository.findRecentOrders(30);
      const averageOrderValue = statistics.total > 0 
        ? recentOrders.reduce((sum, order) => sum + order.total, 0) / recentOrders.length 
        : 0;

      return {
        ...statistics,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        recentOrdersCount: recentOrders.length,
      };
    } catch (error) {
      logger.error('Failed to get order statistics', { error: error.message });
      throw error;
    }
  }

  async processPaymentSuccess(paymentData) {
    try {
      const { orderId, paymentId, amount, provider } = paymentData;
      
      logger.info('Processing payment success', { orderId, paymentId, provider });

      // Update payment status
      await this.orderRepository.updatePaymentStatus(orderId, 'COMPLETED');

      // Move order to processing if it was pending
      const order = await this.orderRepository.findById(orderId);
      if (order.status === 'PENDING') {
        await this.updateOrderStatus(orderId, 'PROCESSING');
      }

      // Send payment confirmation
      await notificationService.sendPaymentConfirmation(order, paymentData);

      return order;
    } catch (error) {
      logger.error('Failed to process payment success', { 
        paymentData, 
        error: error.message 
      });
      throw error;
    }
  }

  async getOrdersRequiringAttention() {
    try {
      // Get orders that might need manual intervention
      const [pendingPayments, longProcessing, manualGeneration] = await Promise.all([
        // Orders pending payment for more than 2 hours
        this.orderRepository.findAll({
          where: {
            paymentStatus: 'PENDING',
            createdAt: {
              lt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
          },
          include: { user: { select: { email: true } } }
        }),
        
        // Orders in processing for more than 48 hours
        this.orderRepository.findAll({
          where: {
            status: 'PROCESSING',
            updatedAt: {
              lt: new Date(Date.now() - 48 * 60 * 60 * 1000)
            }
          },
          include: { user: { select: { email: true } } }
        }),
        
        // Orders needing manual generation
        this.orderRepository.findOrdersRequiringManuals()
      ]);

      return {
        pendingPayments,
        longProcessing,
        manualGeneration,
        totalCount: pendingPayments.length + longProcessing.length + manualGeneration.length
      };
    } catch (error) {
      logger.error('Failed to get orders requiring attention', { error: error.message });
      throw error;
    }
  }

  async bulkUpdateOrderStatus(orderIds, newStatus, metadata = {}) {
    try {
      logger.info('Bulk updating order status', { 
        orderIds, 
        newStatus, 
        count: orderIds.length 
      });

      const results = [];
      
      for (const orderId of orderIds) {
        try {
          const order = await this.updateOrderStatus(orderId, newStatus, metadata);
          results.push({ orderId, success: true, order });
        } catch (error) {
          logger.error('Failed to update order in bulk operation', { 
            orderId, 
            error: error.message 
          });
          results.push({ orderId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      logger.info('Bulk update completed', { 
        total: orderIds.length, 
        successful: successCount,
        failed: orderIds.length - successCount
      });

      return results;
    } catch (error) {
      logger.error('Failed to perform bulk order update', { error: error.message });
      throw error;
    }
  }

  async exportOrders(filters = {}) {
    try {
      logger.info('Exporting orders', { filters });

      const orders = await this.orderRepository.findAll({
        where: filters,
        include: {
          items: true,
          user: { select: { email: true, name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Transform for export
      const exportData = orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        customerName: order.customerInfo?.name || order.user?.name,
        customerEmail: order.customerInfo?.email || order.user?.email,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        trackingNumber: order.trackingNumber,
      }));

      return exportData;
    } catch (error) {
      logger.error('Failed to export orders', { error: error.message });
      throw error;
    }
  }
}

export default OrderService;