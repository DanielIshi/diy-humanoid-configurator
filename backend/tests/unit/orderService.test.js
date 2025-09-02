import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { OrderService } from '../../src/services/orderService.js';

// Mock dependencies
const mockOrderRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn()
};

const mockNotificationService = {
  sendOrderConfirmation: vi.fn(),
  sendOrderStatusUpdate: vi.fn()
};

const mockPaymentService = {
  processPayment: vi.fn(),
  refundPayment: vi.fn()
};

describe('OrderService', () => {
  let orderService;

  beforeEach(() => {
    vi.clearAllMocks();
    orderService = new OrderService(
      mockOrderRepository,
      mockNotificationService,
      mockPaymentService
    );
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Arrange
      const orderData = {
        userId: 'user-123',
        configurationId: 'config-456',
        items: [
          { componentId: 'comp-1', quantity: 2, price: 25.99 },
          { componentId: 'comp-2', quantity: 1, price: 89.99 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          zip: '12345',
          country: 'US'
        }
      };

      const mockOrder = {
        id: 'order-789',
        ...orderData,
        status: 'PENDING',
        totalAmount: 141.97,
        createdAt: new Date()
      };

      mockOrderRepository.create.mockResolvedValue(mockOrder);
      mockNotificationService.sendOrderConfirmation.mockResolvedValue(true);

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...orderData,
          status: 'PENDING',
          totalAmount: 141.97
        })
      );
      expect(mockNotificationService.sendOrderConfirmation).toHaveBeenCalledWith(mockOrder);
      expect(result).toEqual(mockOrder);
    });

    it('should calculate total amount correctly', async () => {
      // Arrange
      const orderData = {
        userId: 'user-123',
        items: [
          { componentId: 'comp-1', quantity: 3, price: 10.00 },
          { componentId: 'comp-2', quantity: 2, price: 15.50 }
        ]
      };

      mockOrderRepository.create.mockResolvedValue({
        id: 'order-123',
        totalAmount: 61.00
      });

      // Act
      await orderService.createOrder(orderData);

      // Assert
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 61.00 // (3 * 10.00) + (2 * 15.50) = 61.00
        })
      );
    });

    it('should throw error for invalid order data', async () => {
      // Arrange
      const invalidOrderData = {
        userId: null,
        items: []
      };

      // Act & Assert
      await expect(orderService.createOrder(invalidOrderData))
        .rejects
        .toThrow('Invalid order data');
    });
  });

  describe('processOrder', () => {
    it('should process order payment successfully', async () => {
      // Arrange
      const orderId = 'order-123';
      const paymentData = {
        paymentMethodId: 'pm_test_123',
        amount: 100.00
      };

      const mockOrder = {
        id: orderId,
        status: 'PENDING',
        totalAmount: 100.00,
        userId: 'user-123'
      };

      const mockPaymentResult = {
        success: true,
        paymentIntentId: 'pi_test_123',
        status: 'succeeded'
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      mockPaymentService.processPayment.mockResolvedValue(mockPaymentResult);
      mockOrderRepository.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
        paymentId: 'pi_test_123'
      });

      // Act
      const result = await orderService.processOrder(orderId, paymentData);

      // Assert
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith(paymentData);
      expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, {
        status: 'PROCESSING',
        paymentId: 'pi_test_123',
        processedAt: expect.any(Date)
      });
      expect(mockNotificationService.sendOrderStatusUpdate).toHaveBeenCalled();
      expect(result.status).toBe('PROCESSING');
    });

    it('should handle payment failure', async () => {
      // Arrange
      const orderId = 'order-123';
      const paymentData = { paymentMethodId: 'pm_fail' };

      const mockOrder = {
        id: orderId,
        status: 'PENDING',
        totalAmount: 100.00
      };

      const mockPaymentResult = {
        success: false,
        error: 'Payment declined'
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);
      mockPaymentService.processPayment.mockResolvedValue(mockPaymentResult);
      mockOrderRepository.update.mockResolvedValue({
        ...mockOrder,
        status: 'FAILED'
      });

      // Act
      const result = await orderService.processOrder(orderId, paymentData);

      // Assert
      expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, {
        status: 'FAILED',
        failureReason: 'Payment declined'
      });
      expect(result.status).toBe('FAILED');
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      // Arrange
      const mockOrder = {
        id: 'order-123',
        userId: 'user-456',
        status: 'COMPLETED'
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      // Act
      const result = await orderService.getOrderById('order-123');

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith('order-123');
      expect(result).toEqual(mockOrder);
    });

    it('should return null when order not found', async () => {
      // Arrange
      mockOrderRepository.findById.mockResolvedValue(null);

      // Act
      const result = await orderService.getOrderById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      // Arrange
      const orderId = 'order-123';
      const newStatus = 'SHIPPED';

      const updatedOrder = {
        id: orderId,
        status: newStatus,
        updatedAt: new Date()
      };

      mockOrderRepository.update.mockResolvedValue(updatedOrder);
      mockNotificationService.sendOrderStatusUpdate.mockResolvedValue(true);

      // Act
      const result = await orderService.updateOrderStatus(orderId, newStatus);

      // Assert
      expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, {
        status: newStatus,
        updatedAt: expect.any(Date)
      });
      expect(mockNotificationService.sendOrderStatusUpdate).toHaveBeenCalledWith(updatedOrder);
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders', async () => {
      // Arrange
      const userId = 'user-123';
      const mockOrders = [
        { id: 'order-1', userId, status: 'COMPLETED' },
        { id: 'order-2', userId, status: 'PENDING' }
      ];

      mockOrderRepository.findByUserId.mockResolvedValue(mockOrders);

      // Act
      const result = await orderService.getUserOrders(userId);

      // Assert
      expect(mockOrderRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockOrders);
    });
  });
});