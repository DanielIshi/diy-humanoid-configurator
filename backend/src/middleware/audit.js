import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';

const prisma = new PrismaClient();

// Audit logging middleware
export const auditLog = (action, entity = 'unknown') => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Track request start time
    const startTime = Date.now();

    // Capture request details
    const auditData = {
      action: `${req.method} ${action}`,
      entity,
      entityId: req.params.id || null,
      userId: req.user?.id || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date()
    };

    // Override send to capture response
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Capture response details
      auditData.statusCode = res.statusCode;
      auditData.duration = duration;
      
      // Parse response for changes (if applicable)
      try {
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          if (parsed.data && typeof parsed.data === 'object') {
            auditData.changes = {
              success: parsed.success,
              responseSize: data.length,
              dataKeys: Object.keys(parsed.data)
            };
          }
        }
      } catch (error) {
        // Ignore parsing errors
      }

      // Log to database asynchronously
      logAuditEvent(auditData, req.body).catch(error => {
        logger.error('Failed to log audit event', { error: error.message });
      });

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

// Log audit event to database
async function logAuditEvent(auditData, requestBody = null) {
  try {
    // Filter sensitive data from request body
    const sanitizedBody = sanitizeRequestBody(requestBody);
    
    const auditLog = await prisma.auditLog.create({
      data: {
        action: auditData.action,
        entity: auditData.entity,
        entityId: auditData.entityId,
        userId: auditData.userId,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        changes: {
          method: auditData.method,
          url: auditData.url,
          statusCode: auditData.statusCode,
          duration: auditData.duration,
          requestBody: sanitizedBody,
          ...auditData.changes
        },
        metadata: {
          timestamp: auditData.timestamp.toISOString(),
          userAgent: auditData.userAgent
        }
      }
    });

    logger.info('Audit event logged', {
      auditId: auditLog.id,
      action: auditData.action,
      userId: auditData.userId,
      duration: auditData.duration
    });

  } catch (error) {
    logger.error('Failed to create audit log', {
      error: error.message,
      auditData: { ...auditData, userAgent: undefined } // Exclude long userAgent
    });
  }
}

// Sanitize request body to remove sensitive information
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const result = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowercaseKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowercaseKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };

  return sanitizeObject(sanitized);
}

// Specific audit loggers for common actions
export const auditAuth = auditLog('auth', 'user');
export const auditAdmin = auditLog('admin', 'system');
export const auditOrder = auditLog('order', 'order');
export const auditConfig = auditLog('configuration', 'configuration');
export const auditPayment = auditLog('payment', 'payment');

// Audit query middleware for sensitive operations
export const auditQuery = (queryDescription) => {
  return auditLog(queryDescription, 'database');
};

// Get audit logs (admin only)
export async function getAuditLogs(filters = {}) {
  const {
    userId,
    action,
    entity,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = filters;

  const where = {};

  if (userId) where.userId = userId;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = entity;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Security event detector
export const detectSecurityEvents = async (auditData) => {
  const { userId, action, ipAddress, userAgent } = auditData;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [];
  
  // Multiple failed login attempts
  if (action.includes('auth') && auditData.statusCode >= 400) {
    const recentFailures = await prisma.auditLog.count({
      where: {
        action: { contains: 'auth' },
        changes: {
          path: ['statusCode'],
          gte: 400
        },
        ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentFailures >= 5) {
      suspiciousPatterns.push({
        type: 'MULTIPLE_AUTH_FAILURES',
        severity: 'HIGH',
        details: `${recentFailures} failed auth attempts from IP ${ipAddress}`
      });
    }
  }

  // Admin actions from new IP
  if (action.includes('admin') && userId) {
    const recentAdminActions = await prisma.auditLog.count({
      where: {
        userId,
        action: { contains: 'admin' },
        ipAddress: { not: ipAddress },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentAdminActions === 0) {
      suspiciousPatterns.push({
        type: 'ADMIN_NEW_IP',
        severity: 'MEDIUM',
        details: `Admin action from new IP ${ipAddress} for user ${userId}`
      });
    }
  }

  // High-frequency API requests
  const recentRequests = await prisma.auditLog.count({
    where: {
      ipAddress,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      }
    }
  });

  if (recentRequests >= 100) {
    suspiciousPatterns.push({
      type: 'HIGH_FREQUENCY_REQUESTS',
      severity: 'MEDIUM',
      details: `${recentRequests} requests in 5 minutes from IP ${ipAddress}`
    });
  }

  // Log security events
  if (suspiciousPatterns.length > 0) {
    logger.warn('Security events detected', {
      patterns: suspiciousPatterns,
      auditData: {
        action: auditData.action,
        userId,
        ipAddress,
        userAgent: userAgent?.substring(0, 100) // Truncate for logging
      }
    });

    // Could trigger additional security measures here
    // e.g., temporary IP blocking, admin notifications, etc.
  }

  return suspiciousPatterns;
};