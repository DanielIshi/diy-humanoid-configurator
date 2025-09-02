// Rate Limiting Middleware für API Endpoints
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redis } = require('../services/cacheService');
const logger = require('../lib/logger');

/**
 * Erstellt einen Rate Limiter mit konfigurierbaren Optionen
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 Minuten
    max = 100, // Max Requests pro Window
    message = 'Zu viele Requests. Bitte versuche es später erneut.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
    skip = null,
    onLimitReached = null
  } = options;

  const store = redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:',
  }) : undefined;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders,
    legacyHeaders,
    store,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || ((req) => {
      // Kombiniere IP, User ID und User-Agent für eindeutige Rate Limiting
      const ip = req.ip || req.connection.remoteAddress;
      const userId = req.user?.id || 'anonymous';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Hash für Datenschutz
      const crypto = require('crypto');
      return crypto.createHash('md5').update(`${ip}-${userId}-${userAgent}`).digest('hex');
    }),
    skip: skip || ((req) => {
      // Skip für Admin Users oder Health Checks
      return req.user?.role === 'ADMIN' || req.path === '/health';
    }),
    onLimitReached: (req, res, options) => {
      const userId = req.user?.id || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress;
      
      logger.warn('Rate Limit Exceeded', {
        userId,
        ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limit: max,
        windowMs
      });

      if (onLimitReached) {
        onLimitReached(req, res, options);
      }
    }
  });
}

/**
 * Standard Rate Limiter für allgemeine API Endpoints
 */
const standardRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 1000, // 1000 Requests pro 15 Minuten
  message: 'Zu viele API-Requests. Bitte warte 15 Minuten.'
});

/**
 * Strenger Rate Limiter für Auth-Endpoints
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // 10 Login-Versuche pro 15 Minuten
  message: 'Zu viele Login-Versuche. Bitte warte 15 Minuten.',
  skipSuccessfulRequests: true, // Erfolgreiche Logins zählen nicht
  keyGenerator: (req) => {
    // Nur IP für Auth Rate Limiting
    return req.ip || req.connection.remoteAddress;
  }
});

/**
 * Moderater Rate Limiter für AI-Endpoints
 */
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 Minute
  max: 30, // 30 AI-Requests pro Minute
  message: 'Zu viele AI-Anfragen. Bitte warte eine Minute.',
  onLimitReached: (req, res, options) => {
    // Zusätzliches Logging für AI Rate Limiting
    logger.warn('AI Rate Limit Hit', {
      userId: req.user?.id || 'anonymous',
      endpoint: req.path,
      tokensRequested: req.body?.maxTokens || 'unknown'
    });
  }
});

/**
 * Sehr strikter Rate Limiter für teure Operationen
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 Minute
  max: 5, // 5 Requests pro Minute
  message: 'Diese Operation ist limitiert. Bitte warte eine Minute.',
});

/**
 * Rate Limiter für File Uploads
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 Minute
  max: 10, // 10 Uploads pro Minute
  message: 'Zu viele Upload-Versuche. Bitte warte eine Minute.',
  skipFailedRequests: true // Fehlgeschlagene Uploads zählen nicht
});

/**
 * Rate Limiter für Passwort-Reset
 */
const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 3, // 3 Passwort-Resets pro Stunde
  message: 'Zu viele Passwort-Reset-Versuche. Bitte warte eine Stunde.',
  keyGenerator: (req) => {
    // Rate Limiting basierend auf Email
    return req.body?.email || req.ip;
  }
});

/**
 * Rate Limiter für Email-Versand
 */
const emailRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 Minute
  max: 5, // 5 Emails pro Minute
  message: 'Zu viele Email-Requests. Bitte warte eine Minute.'
});

/**
 * Dynamischer Rate Limiter basierend auf User-Tier
 */
function createTierBasedRateLimiter(baseLimits) {
  return (req, res, next) => {
    const userTier = req.user?.profile?.tier || 'free';
    const multiplier = {
      free: 1,
      premium: 3,
      enterprise: 10
    }[userTier] || 1;

    const limits = {
      ...baseLimits,
      max: baseLimits.max * multiplier
    };

    const limiter = createRateLimiter(limits);
    return limiter(req, res, next);
  };
}

/**
 * Adaptive Rate Limiter der sich an Server-Last anpasst
 */
function createAdaptiveRateLimiter(options = {}) {
  const baseOptions = {
    windowMs: 60 * 1000,
    max: 100,
    ...options
  };

  return (req, res, next) => {
    // Server-Last messen (vereinfacht)
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    // Rate Limit basierend auf Server-Last anpassen
    let adaptiveMax = baseOptions.max;
    if (heapUsedPercent > 0.8) {
      adaptiveMax = Math.floor(baseOptions.max * 0.5); // 50% bei hoher Last
    } else if (heapUsedPercent > 0.6) {
      adaptiveMax = Math.floor(baseOptions.max * 0.75); // 75% bei mittlerer Last
    }

    const limiter = createRateLimiter({
      ...baseOptions,
      max: adaptiveMax
    });

    return limiter(req, res, next);
  };
}

/**
 * Rate Limiter für Streaming Endpoints
 */
const streamingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 Minute
  max: 10, // 10 Streaming-Verbindungen pro Minute
  message: 'Zu viele Streaming-Anfragen. Bitte warte eine Minute.',
  keyGenerator: (req) => {
    // Kombiniere IP und User für Streaming
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `stream:${ip}:${userId}`;
  }
});

/**
 * Globale Rate Limiter Statistiken
 */
async function getRateLimiterStats() {
  if (!redis) {
    return { error: 'Redis not configured' };
  }

  try {
    const keys = await redis.keys('rl:*');
    const stats = {
      totalLimiters: keys.length,
      activeLimiters: 0,
      topEndpoints: []
    };

    // Aktive Limiter zählen
    for (const key of keys.slice(0, 100)) { // Limit auf 100 für Performance
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        stats.activeLimiters++;
      }
    }

    return stats;
  } catch (error) {
    logger.error('Rate Limiter Stats Error', { error: error.message });
    return { error: 'Failed to get stats' };
  }
}

/**
 * Reset Rate Limiter für einen bestimmten Key
 */
async function resetRateLimit(key) {
  if (!redis) {
    throw new Error('Redis not configured');
  }

  try {
    const deleted = await redis.del(`rl:${key}`);
    logger.info('Rate Limit Reset', { key, deleted });
    return { success: true, deleted };
  } catch (error) {
    logger.error('Reset Rate Limit Error', { error: error.message, key });
    throw error;
  }
}

module.exports = {
  rateLimiter: createRateLimiter,
  standardRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  strictRateLimiter,
  uploadRateLimiter,
  passwordResetRateLimiter,
  emailRateLimiter,
  streamingRateLimiter,
  createTierBasedRateLimiter,
  createAdaptiveRateLimiter,
  getRateLimiterStats,
  resetRateLimit
};