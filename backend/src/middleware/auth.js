import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { UnauthorizedError, BadRequestError, asyncHandler } from './error.js';

const env = getEnv();

// Generate JWT token
export const generateToken = (payload) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.verify(token, env.JWT_SECRET);
};

// Auth middleware
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new UnauthorizedError('Access token required');
  }

  try {
    // Verify token
    const decoded = verifyToken(token);
    
    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      ...decoded
    };
    
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
});

// Role-based access control
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = req.user.role.toLowerCase();
    const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase()) : [roles.toLowerCase()];

    if (!allowedRoles.includes(userRole)) {
      throw new UnauthorizedError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

// Specific role checks
export const requireAdmin = requireRole(['admin']);
export const requireSupport = requireRole(['admin', 'support']);
export const requireCustomer = requireRole(['admin', 'support', 'customer']);

// Email verification check
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.emailVerified) {
    throw new UnauthorizedError('Email verification required. Please check your email and verify your account.');
  }

  next();
};

// Account status check
export const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.isActive) {
    throw new UnauthorizedError('Account is deactivated. Please contact support.');
  }

  next();
};

// Combined middleware for full auth + verification
export const requireAuth = [protect, requireActiveAccount];
export const requireVerifiedAuth = [protect, requireActiveAccount, requireVerifiedEmail];

// Resource ownership check
export const requireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Admin bypass
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      throw new BadRequestError('Resource ID required');
    }

    // This would need to be implemented based on the specific resource
    // For now, we'll add the logic to check ownership
    req.resourceOwnership = {
      resourceId,
      userIdField,
      userId: req.user.id
    };

    next();
  };
};

// API key middleware for public endpoints
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    throw new UnauthorizedError('API key required');
  }
  
  // For now, just log the key - implement proper API key validation later
  req.apiKey = apiKey;
  next();
};

// Rate limiting by user
export const userRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const attempts = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (attempts.has(userId)) {
      const userAttempts = attempts.get(userId).filter(timestamp => timestamp > windowStart);
      attempts.set(userId, userAttempts);
    }

    const userAttempts = attempts.get(userId) || [];
    
    if (userAttempts.length >= max) {
      throw new UnauthorizedError('Rate limit exceeded for this user');
    }

    userAttempts.push(now);
    attempts.set(userId, userAttempts);

    next();
  };
};