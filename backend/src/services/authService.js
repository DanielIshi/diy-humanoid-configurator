import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getEnv } from '../config/env.js';
import { UnauthorizedError, BadRequestError, ConflictError } from '../middleware/error.js';
import { logger } from '../lib/logger.js';

const prisma = new PrismaClient();
const env = getEnv();

export class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minutes
  }

  // Password hashing
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // JWT token generation
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      emailVerified: user.emailVerified
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || '15m',
      issuer: 'diy-humanoid-configurator',
      audience: 'diy-humanoid-app'
    });
  }

  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  // User registration
  async register(userData) {
    const { email, password, name } = userData;

    // Validate password strength
    this.validatePassword(password);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Generate email verification token
    const verificationToken = await this.createEmailVerificationToken(user.email, user.id);

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user,
      verificationToken: verificationToken.token
    };
  }

  // User login
  async login(email, password, ipAddress, userAgent) {
    // Check for too many failed attempts
    await this.checkLoginAttempts(email, ipAddress);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      await this.recordLoginAttempt(email, ipAddress, userAgent, false);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked. Try again later.');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      await this.recordLoginAttempt(email, ipAddress, userAgent, false);
      await this.incrementLoginAttempts(user.id);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Successful login - reset login attempts and update last login
    await this.recordLoginAttempt(email, ipAddress, userAgent, true);
    await this.resetLoginAttempts(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      ipAddress 
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken
    };
  }

  // Token refresh
  async refreshToken(refreshTokenValue) {
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { 
        token: refreshTokenValue,
        isRevoked: false,
        expiresAt: {
          gte: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            isActive: true
          }
        }
      }
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (!refreshTokenRecord.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(refreshTokenRecord.user);
    const newRefreshToken = this.generateRefreshToken();

    // Token rotation - revoke old token and create new one
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { isRevoked: true }
      });

      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: refreshTokenRecord.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    });

    return {
      user: refreshTokenRecord.user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  // Logout
  async logout(refreshToken) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true }
      });
    }
  }

  // Email verification
  async createEmailVerificationToken(email, userId = null) {
    const token = crypto.randomBytes(32).toString('hex');
    
    const verificationToken = await prisma.emailVerification.create({
      data: {
        email,
        token,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    return verificationToken;
  }

  async verifyEmail(token) {
    const verificationRecord = await prisma.emailVerification.findUnique({
      where: { 
        token,
        used: false,
        expiresAt: {
          gte: new Date()
        }
      }
    });

    if (!verificationRecord) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    // Update user and mark token as used
    await prisma.$transaction(async (tx) => {
      if (verificationRecord.userId) {
        await tx.user.update({
          where: { id: verificationRecord.userId },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date()
          }
        });
      }

      await tx.emailVerification.update({
        where: { id: verificationRecord.id },
        data: { used: true }
      });
    });

    logger.info('Email verified successfully', { 
      email: verificationRecord.email,
      userId: verificationRecord.userId 
    });

    return true;
  }

  // Password reset
  async createPasswordResetToken(email) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists
      return { token: 'dummy-token' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    
    const resetToken = await prisma.passwordReset.create({
      data: {
        email,
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    logger.info('Password reset token created', { email, userId: user.id });

    return { token: resetToken.token };
  }

  async resetPassword(token, newPassword) {
    this.validatePassword(newPassword);

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { 
        token,
        used: false,
        expiresAt: {
          gte: new Date()
        }
      }
    });

    if (!resetRecord) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and mark token as used
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          loginAttempts: 0,
          lockedUntil: null
        }
      });

      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true }
      });

      // Revoke all existing refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { isRevoked: true }
      });
    });

    logger.info('Password reset successfully', { 
      email: resetRecord.email,
      userId: resetRecord.userId 
    });

    return true;
  }

  // Login attempt tracking
  async recordLoginAttempt(email, ipAddress, userAgent, success) {
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        success
      }
    });
  }

  async checkLoginAttempts(email, ipAddress) {
    const recentAttempts = await prisma.loginAttempt.count({
      where: {
        OR: [
          { email },
          { ipAddress }
        ],
        success: false,
        createdAt: {
          gte: new Date(Date.now() - this.lockoutTime)
        }
      }
    });

    if (recentAttempts >= this.maxLoginAttempts) {
      throw new UnauthorizedError('Too many login attempts. Please try again later.');
    }
  }

  async incrementLoginAttempts(userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: { increment: 1 }
      },
      select: { loginAttempts: true }
    });

    // Lock account after max attempts
    if (user.loginAttempts >= this.maxLoginAttempts) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + this.lockoutTime)
        }
      });
    }
  }

  async resetLoginAttempts(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });
  }

  // Password validation
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    if (password.length < minLength) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    if (!hasUpperCase || !hasLowerCase) {
      throw new BadRequestError('Password must contain both uppercase and lowercase letters');
    }

    if (!hasNumbers) {
      throw new BadRequestError('Password must contain at least one number');
    }

    if (!hasNonalphas) {
      throw new BadRequestError('Password must contain at least one special character');
    }
  }

  // Get current user
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        isActive: true,
        isTwoFactorEnabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  // Cleanup expired tokens
  async cleanupExpiredTokens() {
    const now = new Date();
    
    await prisma.$transaction(async (tx) => {
      // Clean expired refresh tokens
      await tx.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { isRevoked: true }
          ]
        }
      });

      // Clean expired password reset tokens
      await tx.passwordReset.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true }
          ]
        }
      });

      // Clean expired email verification tokens
      await tx.emailVerification.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true }
          ]
        }
      });

      // Clean old login attempts (older than 24 hours)
      await tx.loginAttempt.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });
    });

    logger.info('Expired auth tokens cleaned up');
  }
}

export const authService = new AuthService();