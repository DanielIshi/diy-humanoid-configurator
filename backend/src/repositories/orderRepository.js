import BaseRepository from './baseRepository.js';
import { v4 as uuidv4 } from 'uuid';

class OrderRepository extends BaseRepository {
  constructor() {
    super('order');
  }

  async findByUser(userId, options = {}) {
    return this.findAll({
      where: { userId },
      include: {
        items: true,
        payments: true,
        configuration: true,
      },
      orderBy: { createdAt: 'desc' },
      ...options,
    });
  }

  async findByStatus(status, options = {}) {
    return this.findAll({
      where: { status },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
      ...options,
    });
  }

  async findByOrderNumber(orderNumber) {
    return this.findOne({ orderNumber }, {
      items: {
        include: { product: true }
      },
      payments: true,
      configuration: {
        include: { components: true }
      },
      user: { select: { id: true, name: true, email: true } },
    });
  }

  async createOrder(orderData) {
    const orderNumber = this.generateOrderNumber();
    
    return this.create({
      ...orderData,
      orderNumber,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });
  }

  async createOrderWithItems(orderData, items) {
    return this.transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          ...orderData,
          orderNumber: this.generateOrderNumber(),
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      const orderItems = await Promise.all(
        items.map(item =>
          prisma.orderItem.create({
            data: {
              ...item,
              orderId: order.id,
            },
          })
        )
      );

      return { order, items: orderItems };
    });
  }

  async updateStatus(orderId, status) {
    return this.update(orderId, { status });
  }

  async updatePaymentStatus(orderId, paymentStatus) {
    return this.update(orderId, { paymentStatus });
  }

  async updateTracking(orderId, trackingNumber, shippingMethod, estimatedDelivery) {
    return this.update(orderId, {
      trackingNumber,
      shippingMethod,
      estimatedDelivery,
    });
  }

  async findPendingOrders() {
    return this.findByStatus('PENDING');
  }

  async findProcessingOrders() {
    return this.findByStatus('PROCESSING');
  }

  async findOrdersForShipping() {
    return this.findAll({
      where: {
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
      },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getOrderStatistics(dateFrom, dateTo) {
    const where = {};
    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: dateFrom,
        lte: dateTo,
      };
    }

    const [total, pending, processing, shipped, delivered, cancelled] = await Promise.all([
      this.count(where),
      this.count({ ...where, status: 'PENDING' }),
      this.count({ ...where, status: 'PROCESSING' }),
      this.count({ ...where, status: 'SHIPPED' }),
      this.count({ ...where, status: 'DELIVERED' }),
      this.count({ ...where, status: 'CANCELLED' }),
    ]);

    return {
      total,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
    };
  }

  async findRecentOrders(limit = 10) {
    return this.findAll({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findOrdersRequiringManuals() {
    return this.findAll({
      where: {
        status: { in: ['PROCESSING', 'SHIPPED'] },
        manuals: { none: {} }, // Orders without manuals
      },
      include: {
        configuration: {
          include: { components: true }
        },
      },
    });
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  async addPayment(orderId, paymentData) {
    return this.transaction(async (prisma) => {
      const payment = await prisma.payment.create({
        data: {
          ...paymentData,
          orderId,
        },
      });

      if (paymentData.status === 'COMPLETED') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'COMPLETED' },
        });
      }

      return payment;
    });
  }
}

export default OrderRepository;