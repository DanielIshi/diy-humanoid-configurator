import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Rate limiters for auth endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long')
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required')
  })
});

// Routes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  moderateLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    logger.info('User registration attempt', { email, ipAddress });

    const result = await authService.register({ email, password, name });

    // Send welcome email with verification token
    try {
      await emailService.sendWelcomeEmail(result.user, result.verificationToken);
    } catch (error) {
      logger.warn('Failed to send welcome email', { 
        email, 
        error: error.message 
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: result.user
      }
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  strictLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    logger.info('Login attempt', { email, ipAddress });

    const result = await authService.login(email, password, ipAddress, userAgent);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send login notification email (optional, for security)
    try {
      await emailService.sendLoginNotificationEmail(result.user, {
        ipAddress,
        userAgent,
        timestamp: new Date()
      });
    } catch (error) {
      logger.warn('Failed to send login notification', { 
        email, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh',
  validate(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    // Also check cookies as fallback
    const token = refreshToken || req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const result = await authService.refreshToken(token);

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Private
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    logger.info('User logged out', { 
      userId: req.user?.id,
      email: req.user?.email 
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me',
  protect,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);

    res.json({
      success: true,
      data: {
        user
      }
    });
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  moderateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    logger.info('Password reset requested', { email, ipAddress });

    const result = await authService.createPasswordResetToken(email);

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, result.token);
    } catch (error) {
      logger.warn('Failed to send password reset email', { 
        email, 
        error: error.message 
      });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with this email exists, you will receive password reset instructions.'
    });
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  strictLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    logger.info('Password reset attempt', { token: token.substring(0, 8) + '...', ipAddress });

    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.'
    });
  })
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email',
  moderateLimiter,
  validate(verifyEmailSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    logger.info('Email verification attempt', { token: token.substring(0, 8) + '...' });

    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully. Your account is now active.'
    });
  })
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification',
  moderateLimiter,
  validate(z.object({
    body: z.object({
      email: z.string().email('Invalid email address')
    })
  })),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    logger.info('Resend verification requested', { email });

    // Create new verification token
    const verificationToken = await authService.createEmailVerificationToken(email);

    // Send verification email
    try {
      await emailService.sendEmailVerificationEmail(email, verificationToken.token);
    } catch (error) {
      logger.warn('Failed to send verification email', { 
        email, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      message: 'If an account with this email exists and is not yet verified, a verification email has been sent.'
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for logged-in user
 * @access  Private
 */
router.post('/change-password',
  protect,
  validate(z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters')
    })
  })),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    logger.info('Password change attempt', { userId });

    // This would need to be implemented in authService
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Password change functionality coming soon'
    });
  })
);

/**
 * @route   GET /api/auth/admin/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/admin/users',
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // This would fetch users from the database
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Admin user management coming soon',
      data: {
        users: []
      }
    });
  })
);

/**
 * @route   POST /api/auth/admin/cleanup
 * @desc    Cleanup expired tokens (admin only)
 * @access  Private/Admin
 */
router.post('/admin/cleanup',
  protect,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await authService.cleanupExpiredTokens();

    logger.info('Token cleanup completed by admin', { adminId: req.user.id });

    res.json({
      success: true,
      message: 'Expired tokens cleaned up successfully'
    });
  })
);

export default router;