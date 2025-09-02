import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { PaymentService } from '../../src/services/paymentService.js';

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn()
  },
  refunds: {
    create: vi.fn()
  }
};

describe('PaymentService', () => {
  let paymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentService = new PaymentService(mockStripe);
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      // Arrange
      const paymentData = {
        amount: 10000, // $100.00 in cents
        currency: 'usd',
        orderId: 'order-123',
        customerId: 'user-456'
      };

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_456',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method'
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await paymentService.createPaymentIntent(paymentData);

      // Assert
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'usd',
        metadata: {
          orderId: 'order-123',
          customerId: 'user-456'
        },
        automatic_payment_methods: {
          enabled: true
        }
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should throw error for invalid amount', async () => {
      // Arrange
      const invalidPaymentData = {
        amount: -100,
        currency: 'usd'
      };

      // Act & Assert
      await expect(paymentService.createPaymentIntent(invalidPaymentData))
        .rejects
        .toThrow('Invalid payment amount');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      // Arrange
      const paymentIntentId = 'pi_test_123';
      const paymentMethodId = 'pm_test_456';

      const mockConfirmedPayment = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 10000,
        charges: {
          data: [{
            id: 'ch_test_789',
            amount: 10000,
            status: 'succeeded'
          }]
        }
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);

      // Act
      const result = await paymentService.confirmPayment(paymentIntentId, paymentMethodId);

      // Assert
      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: expect.any(String)
      });
      expect(result).toEqual({
        success: true,
        paymentIntent: mockConfirmedPayment
      });
    });

    it('should handle payment failure', async () => {
      // Arrange
      const paymentIntentId = 'pi_test_fail';
      const paymentMethodId = 'pm_test_fail';

      const mockFailedPayment = {
        id: paymentIntentId,
        status: 'requires_payment_method',
        last_payment_error: {
          message: 'Your card was declined'
        }
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockFailedPayment);

      // Act
      const result = await paymentService.confirmPayment(paymentIntentId, paymentMethodId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Your card was declined',
        paymentIntent: mockFailedPayment
      });
    });

    it('should handle Stripe API errors', async () => {
      // Arrange
      const paymentIntentId = 'pi_invalid';
      const paymentMethodId = 'pm_test';

      mockStripe.paymentIntents.confirm.mockRejectedValue(
        new Error('No such payment_intent')
      );

      // Act & Assert
      await expect(paymentService.confirmPayment(paymentIntentId, paymentMethodId))
        .rejects
        .toThrow('Payment confirmation failed');
    });
  });

  describe('processPayment', () => {
    it('should process payment end-to-end successfully', async () => {
      // Arrange
      const paymentData = {
        amount: 5000,
        currency: 'usd',
        paymentMethodId: 'pm_test_123',
        orderId: 'order-456'
      };

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret'
      };

      const mockConfirmedPayment = {
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 5000
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedPayment);

      // Act
      const result = await paymentService.processPayment(paymentData);

      // Assert
      expect(result).toEqual({
        success: true,
        paymentIntentId: 'pi_test_123',
        status: 'succeeded',
        amount: 5000
      });
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      // Arrange
      const refundData = {
        paymentIntentId: 'pi_test_123',
        amount: 2500, // Partial refund
        reason: 'requested_by_customer'
      };

      const mockRefund = {
        id: 'rfd_test_456',
        amount: 2500,
        status: 'succeeded',
        payment_intent: 'pi_test_123'
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Act
      const result = await paymentService.refundPayment(refundData);

      // Assert
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 2500,
        reason: 'requested_by_customer'
      });
      expect(result).toEqual({
        success: true,
        refund: mockRefund
      });
    });

    it('should handle full refund', async () => {
      // Arrange
      const refundData = {
        paymentIntentId: 'pi_test_123'
        // No amount specified = full refund
      };

      const mockRefund = {
        id: 'rfd_test_456',
        amount: 10000,
        status: 'succeeded'
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Act
      const result = await paymentService.refundPayment(refundData);

      // Assert
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123'
        // No amount = full refund
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment intent status', async () => {
      // Arrange
      const paymentIntentId = 'pi_test_123';
      const mockPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: 10000,
        created: Math.floor(Date.now() / 1000)
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      // Act
      const result = await paymentService.getPaymentStatus(paymentIntentId);

      // Assert
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId);
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment intent successfully', async () => {
      // Arrange
      const paymentIntentId = 'pi_test_123';
      const mockCancelledPayment = {
        id: paymentIntentId,
        status: 'canceled'
      };

      mockStripe.paymentIntents.cancel.mockResolvedValue(mockCancelledPayment);

      // Act
      const result = await paymentService.cancelPayment(paymentIntentId);

      // Assert
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(paymentIntentId);
      expect(result).toEqual({
        success: true,
        paymentIntent: mockCancelledPayment
      });
    });
  });
});