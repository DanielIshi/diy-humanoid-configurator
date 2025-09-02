import crypto from 'crypto';
import { cacheService } from '../services/cacheService.js';
import { UnauthorizedError, BadRequestError } from './error.js';
import { logger } from '../lib/logger.js';

// CSRF Token Management
export class CSRFService {
  constructor() {
    this.tokenTTL = 60 * 60; // 1 hour
    this.secretLength = 32;
  }

  // Generate CSRF token
  generateToken(sessionId) {
    const secret = crypto.randomBytes(this.secretLength).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${sessionId}:${timestamp}:${secret}`;
    
    const token = crypto
      .createHmac('sha256', process.env.CSRF_SECRET || 'default-csrf-secret')
      .update(payload)
      .digest('hex');

    return {
      token: `${timestamp}.${token}`,
      secret,
      sessionId,
      createdAt: new Date(parseInt(timestamp))
    };
  }

  // Verify CSRF token
  async verifyToken(token, sessionId) {
    if (!token || !sessionId) {
      return false;
    }

    try {
      const [timestamp, hash] = token.split('.');
      if (!timestamp || !hash) {
        return false;
      }

      // Check if token is expired
      const tokenAge = (Date.now() - parseInt(timestamp)) / 1000;
      if (tokenAge > this.tokenTTL) {
        return false;
      }

      // Check if token was already used (prevent replay)
      const tokenKey = `csrf:${hash}`;
      const wasUsed = await cacheService.get('csrf', tokenKey);
      if (wasUsed) {
        return false;
      }

      // Get stored secret for this session
      const storedData = await cacheService.get('csrf', `session:${sessionId}`);
      if (!storedData) {
        return false;
      }

      // Reconstruct payload and verify
      const payload = `${sessionId}:${timestamp}:${storedData.secret}`;
      const expectedHash = crypto
        .createHmac('sha256', process.env.CSRF_SECRET || 'default-csrf-secret')
        .update(payload)
        .digest('hex');

      if (hash !== expectedHash) {
        return false;
      }

      // Mark token as used
      await cacheService.set('csrf', tokenKey, true, this.tokenTTL);
      
      return true;
    } catch (error) {
      logger.error('CSRF token verification error:', error);
      return false;
    }
  }

  // Store token data for session
  async storeTokenData(sessionId, tokenData) {
    await cacheService.set(
      'csrf', 
      `session:${sessionId}`, 
      {
        secret: tokenData.secret,
        createdAt: tokenData.createdAt
      }, 
      this.tokenTTL
    );
  }

  // Clean up expired tokens
  async cleanup() {
    // Redis pattern cleanup handled by TTL
    logger.info('CSRF tokens cleanup completed');
  }
}

const csrfService = new CSRFService();

// Middleware to generate CSRF token
export function generateCSRFToken(req, res, next) {
  try {
    const sessionId = req.sessionId || req.user?.id || 'anonymous';
    const tokenData = csrfService.generateToken(sessionId);
    
    // Store token data
    csrfService.storeTokenData(sessionId, tokenData);
    
    // Add token to response
    res.locals.csrfToken = tokenData.token;
    
    // Set CSRF token in header for AJAX requests
    res.set('X-CSRF-Token', tokenData.token);
    
    next();
  } catch (error) {
    logger.error('CSRF token generation error:', error);
    next(new BadRequestError('Failed to generate CSRF token'));
  }
}

// Middleware to verify CSRF token
export function verifyCSRFToken(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.sessionId || req.user?.id;
  if (!sessionId) {
    return next(new UnauthorizedError('Session required for CSRF protection'));
  }

  // Get token from header or body
  const token = req.get('X-CSRF-Token') || 
                req.get('X-Requested-With') === 'XMLHttpRequest' ? req.get('X-CSRF-Token') :
                req.body._csrf || 
                req.query._csrf;

  if (!token) {
    logger.warn('Missing CSRF token', { 
      sessionId, 
      method: req.method, 
      url: req.originalUrl,
      ip: req.ip
    });
    return next(new UnauthorizedError('CSRF token required'));
  }

  csrfService.verifyToken(token, sessionId).then(isValid => {
    if (!isValid) {
      logger.warn('Invalid CSRF token', { 
        sessionId, 
        token: token.substring(0, 8) + '...',
        method: req.method, 
        url: req.originalUrl,
        ip: req.ip
      });
      return next(new UnauthorizedError('Invalid CSRF token'));
    }
    
    next();
  }).catch(error => {
    logger.error('CSRF verification error:', error);
    next(new BadRequestError('CSRF verification failed'));
  });
}

// Middleware for double-submit cookie pattern
export function doubleSubmitCookie(req, res, next) {
  try {
    const sessionId = req.sessionId || req.user?.id || crypto.randomUUID();
    const tokenData = csrfService.generateToken(sessionId);
    
    // Set CSRF token in secure cookie
    res.cookie('XSRF-TOKEN', tokenData.token, {
      httpOnly: false, // Allow JavaScript access for AJAX
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: csrfService.tokenTTL * 1000
    });
    
    // Store token data
    csrfService.storeTokenData(sessionId, tokenData);
    
    req.csrfToken = tokenData.token;
    
    next();
  } catch (error) {
    logger.error('Double submit cookie error:', error);
    next(new BadRequestError('Failed to set CSRF protection'));
  }
}

// Helper function to get CSRF token for templates
export function getCSRFToken(req) {
  return res.locals.csrfToken || req.csrfToken;
}

export { csrfService };
