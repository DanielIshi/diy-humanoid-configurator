import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { UnauthorizedError, asyncHandler } from './error.js';

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

// Admin role check
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  next();
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