import request from 'supertest';
import { createServer } from '../src/app.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = createServer();

describe('Authentication System', () => {
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'CUSTOMER',
        emailVerified: true,
        isActive: true
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true,
        isActive: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: [testUser.id, adminUser.id]
        }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, adminUser.id]
        }
      }
    });
    
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.role).toBe('CUSTOMER');
      expect(response.body.data.user.emailVerified).toBe(false);

      // Cleanup
      await prisma.user.delete({
        where: { email: userData.email }
      });
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'weak@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Duplicate User',
        email: testUser.email,
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });

      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      refreshToken = refreshTokenCookie.split('=')[1].split(';')[0];
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });
      
      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });
      
      accessToken = loginResponse.body.data.accessToken;
      
      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      refreshToken = refreshTokenCookie.split('=')[1].split(';')[0];
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with this email exists');
    });

    it('should handle password reset for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return success to prevent email enumeration
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account with this email exists');
    });
  });

  describe('Email Verification', () => {
    it('should handle email verification with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should resend verification email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verification email has been sent');
    });
  });
});

describe('Authorization Middleware', () => {
  let customerToken;
  let adminToken;

  beforeAll(async () => {
    // Login as customer
    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'TestPassword123!'
      });
    customerToken = customerLogin.body.data.accessToken;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: 'TestPassword123!'
      });
    adminToken = adminLogin.body.data.accessToken;
  });

  describe('Admin Routes Protection', () => {
    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny customer access to admin routes', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should deny unauthenticated access to admin routes', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });
});

describe('Rate Limiting', () => {
  it('should apply rate limiting to login attempts', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'wrong-password'
    };

    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData);
    }

    // The 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429);

    expect(response.body.error).toContain('Too many attempts');
  });
});

describe('Security Features', () => {
  let accessToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'TestPassword123!'
      });
    accessToken = loginResponse.body.data.accessToken;
  });

  it('should include security headers', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Check for security headers (these are added by helmet middleware)
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('0');
  });

  it('should handle CORS properly', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });
});