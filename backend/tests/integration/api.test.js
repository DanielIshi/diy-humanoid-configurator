import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Setup test database and server
    server = app.listen(0); // Random available port
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Reset database state before each test
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        environment: 'test'
      });
    });
  });

  describe('Components API', () => {
    it('should get all components', async () => {
      const response = await request(app)
        .get('/api/components')
        .expect(200);

      expect(response.body).toHaveProperty('components');
      expect(Array.isArray(response.body.components)).toBe(true);
    });

    it('should get component by category', async () => {
      const response = await request(app)
        .get('/api/components?category=actuators')
        .expect(200);

      expect(response.body).toHaveProperty('components');
      response.body.components.forEach(component => {
        expect(component.category).toBe('actuators');
      });
    });

    it('should return 404 for non-existent component', async () => {
      const response = await request(app)
        .get('/api/components/nonexistent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Component not found'
      });
    });
  });

  describe('Configurations API', () => {
    it('should create new configuration', async () => {
      const configurationData = {
        name: 'Test Robot Configuration',
        description: 'A test robot for automated testing',
        components: [
          { componentId: 'servo-motor-1', quantity: 4 },
          { componentId: 'arduino-uno', quantity: 1 }
        ]
      };

      const response = await request(app)
        .post('/api/configurations')
        .send(configurationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(configurationData.name);
      expect(response.body.components).toHaveLength(2);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field'
        // name is required
      };

      const response = await request(app)
        .post('/api/configurations')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
    });

    it('should get configuration by id', async () => {
      // First create a configuration
      const configData = {
        name: 'Get Test Config',
        description: 'Configuration for get test',
        components: []
      };

      const createResponse = await request(app)
        .post('/api/configurations')
        .send(configData)
        .expect(201);

      const configId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/api/configurations/${configId}`)
        .expect(200);

      expect(getResponse.body.id).toBe(configId);
      expect(getResponse.body.name).toBe(configData.name);
    });
  });

  describe('Manual Generation API', () => {
    it('should generate manual for configuration', async () => {
      // Create a configuration first
      const configData = {
        name: 'Manual Test Robot',
        description: 'Robot for manual generation test',
        components: [
          { componentId: 'servo-motor-1', quantity: 2 }
        ]
      };

      const configResponse = await request(app)
        .post('/api/configurations')
        .send(configData)
        .expect(201);

      const configId = configResponse.body.id;

      // Generate manual
      const manualResponse = await request(app)
        .post(`/api/configurations/${configId}/manual`)
        .expect(201);

      expect(manualResponse.body).toHaveProperty('id');
      expect(manualResponse.body).toHaveProperty('title');
      expect(manualResponse.body).toHaveProperty('sections');
      expect(manualResponse.body.configurationId).toBe(configId);
    });

    it('should return 404 for non-existent configuration', async () => {
      const response = await request(app)
        .post('/api/configurations/nonexistent/manual')
        .expect(404);

      expect(response.body.error).toBe('Configuration not found');
    });
  });

  describe('Orders API', () => {
    it('should create order', async () => {
      const orderData = {
        configurationId: 'test-config-id',
        items: [
          { componentId: 'servo-1', quantity: 2, price: 25.99 }
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          zip: '12345',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.totalAmount).toBe(51.98); // 2 * 25.99
    });

    it('should validate order data', async () => {
      const invalidOrderData = {
        items: [], // Empty items
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Payment API', () => {
    it('should create payment intent', async () => {
      const paymentData = {
        amount: 10000,
        currency: 'usd',
        orderId: 'test-order-id'
      };

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
    });

    it('should validate payment amount', async () => {
      const invalidPaymentData = {
        amount: -100,
        currency: 'usd'
      };

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body.error).toContain('amount');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/configurations')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/components')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/configurations')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});