import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.js';

const env = getEnv();

// Security middleware
export const security = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate limiting
export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000, // minutes in ms
  max: env.RATE_LIMIT_MAX, // limit each IP to max requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: env.RATE_LIMIT_WINDOW * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});