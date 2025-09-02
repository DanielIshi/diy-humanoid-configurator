import crypto from 'crypto';
import { cacheService } from './cacheService.js';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { UnauthorizedError } from '../middleware/error.js';

const prisma = new PrismaClient();

export class SessionService {
  constructor() {
    this.sessionTTL = 7 * 24 * 60 * 60; // 7 days in seconds
    this.maxSessionsPerUser = 5; // Maximum concurrent sessions
  }

  // Generate device fingerprint
  generateDeviceFingerprint(userAgent, ipAddress) {
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}:${ipAddress}:${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    
    return fingerprint;
  }

  // Create session with device tracking
  async createSession(userId, ipAddress, userAgent, rememberMe = false) {
    const sessionId = crypto.randomUUID();
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);
    const ttl = rememberMe ? 30 * 24 * 60 * 60 : this.sessionTTL; // 30 days if remember me
    
    const sessionData = {
      userId,
      sessionId,
      deviceFingerprint,
      ipAddress,
      userAgent,
      isActive: true,
      rememberMe,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000)
    };

    // Store in Redis
    await cacheService.set('sessions', sessionId, sessionData, ttl);
    
    // Store in database for persistence
    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        rememberMe,
        expiresAt: sessionData.expiresAt
      }
    });

    // Clean up old sessions if user has too many
    await this.cleanupUserSessions(userId);

    logger.info('Session created', { userId, sessionId, deviceFingerprint });
    
    return sessionData;
  }

  // Get session data
  async getSession(sessionId) {
    // Try Redis first
    let sessionData = await cacheService.get('sessions', sessionId);
    
    if (!sessionData) {
      // Fallback to database
      const dbSession = await prisma.session.findUnique({
        where: { 
          id: sessionId,
          isActive: true,
          expiresAt: { gte: new Date() }
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

      if (dbSession) {
        sessionData = {
          userId: dbSession.userId,
          sessionId: dbSession.id,
          deviceFingerprint: dbSession.deviceFingerprint,
          ipAddress: dbSession.ipAddress,
          userAgent: dbSession.userAgent,
          isActive: dbSession.isActive,
          rememberMe: dbSession.rememberMe,
          createdAt: dbSession.createdAt,
          lastActivity: dbSession.lastActivity,
          user: dbSession.user
        };
        
        // Restore to Redis
        const ttl = Math.floor((dbSession.expiresAt - Date.now()) / 1000);
        if (ttl > 0) {
          await cacheService.set('sessions', sessionId, sessionData, ttl);
        }
      }
    }

    return sessionData;
  }

  // Update session activity
  async updateSessionActivity(sessionId, ipAddress) {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return null;

    // Update last activity
    sessionData.lastActivity = new Date();
    sessionData.ipAddress = ipAddress; // Track IP changes

    // Update in Redis
    const ttl = sessionData.rememberMe ? 30 * 24 * 60 * 60 : this.sessionTTL;
    await cacheService.set('sessions', sessionId, sessionData, ttl);

    // Update in database
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: sessionData.lastActivity,
        ipAddress
      }
    });

    return sessionData;
  }

  // Get all active sessions for user
  async getUserSessions(userId) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gte: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });

    return sessions.map(session => ({
      id: session.id,
      deviceFingerprint: session.deviceFingerprint,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      rememberMe: session.rememberMe,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrent: false // Will be set by caller
    }));
  }

  // Terminate session
  async terminateSession(sessionId, userId = null) {
    // Remove from Redis
    await cacheService.delete('sessions', sessionId);

    // Update database
    const whereClause = userId ? { id: sessionId, userId } : { id: sessionId };
    
    const session = await prisma.session.update({
      where: whereClause,
      data: { 
        isActive: false,
        terminatedAt: new Date()
      }
    });

    logger.info('Session terminated', { sessionId, userId: session.userId });
    
    return true;
  }

  // Terminate all sessions for user (except current)
  async terminateAllUserSessions(userId, exceptSessionId = null) {
    const whereClause = {
      userId,
      isActive: true
    };
    
    if (exceptSessionId) {
      whereClause.id = { not: exceptSessionId };
    }

    // Get session IDs to remove from Redis
    const sessions = await prisma.session.findMany({
      where: whereClause,
      select: { id: true }
    });

    // Remove from Redis
    for (const session of sessions) {
      await cacheService.delete('sessions', session.id);
    }

    // Update database
    const result = await prisma.session.updateMany({
      where: whereClause,
      data: { 
        isActive: false,
        terminatedAt: new Date()
      }
    });

    logger.info('Multiple sessions terminated', { userId, count: result.count });
    
    return result.count;
  }

  // Check device trust
  async checkDeviceTrust(userId, deviceFingerprint) {
    const trustedDevice = await prisma.trustedDevice.findUnique({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      }
    });

    return {
      isTrusted: !!trustedDevice,
      trustedAt: trustedDevice?.trustedAt || null
    };
  }

  // Add trusted device
  async trustDevice(userId, deviceFingerprint, deviceName = null) {
    await prisma.trustedDevice.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      },
      update: {
        trustedAt: new Date(),
        deviceName
      },
      create: {
        userId,
        deviceFingerprint,
        deviceName,
        trustedAt: new Date()
      }
    });

    logger.info('Device trusted', { userId, deviceFingerprint });
  }

  // Remove trusted device
  async untrustDevice(userId, deviceFingerprint) {
    await prisma.trustedDevice.delete({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint
        }
      }
    });

    // Terminate all sessions from this device
    await this.terminateAllUserSessions(userId);

    logger.info('Device untrusted', { userId, deviceFingerprint });
  }

  // Clean up old sessions
  async cleanupUserSessions(userId) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gte: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });

    if (sessions.length > this.maxSessionsPerUser) {
      const sessionsToTerminate = sessions.slice(this.maxSessionsPerUser);
      
      for (const session of sessionsToTerminate) {
        await this.terminateSession(session.id);
      }
      
      logger.info('Cleaned up old sessions', { 
        userId, 
        terminated: sessionsToTerminate.length 
      });
    }
  }

  // Cleanup expired sessions (run periodically)
  async cleanupExpiredSessions() {
    const expired = await prisma.session.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      },
      data: {
        isActive: false,
        terminatedAt: new Date()
      }
    });

    // Clean from Redis (pattern delete if available)
    await cacheService.clearNamespace('sessions');

    logger.info('Expired sessions cleaned up', { count: expired.count });
    return expired.count;
  }

  // Session analytics
  async getSessionAnalytics(userId = null) {
    const whereClause = userId ? { userId } : {};
    
    const [totalSessions, activeSessions, expiredSessions] = await Promise.all([
      prisma.session.count({ where: whereClause }),
      prisma.session.count({ 
        where: { 
          ...whereClause, 
          isActive: true, 
          expiresAt: { gte: new Date() } 
        } 
      }),
      prisma.session.count({ 
        where: { 
          ...whereClause, 
          OR: [
            { expiresAt: { lt: new Date() } },
            { isActive: false }
          ]
        } 
      })
    ]);

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      cleanupNeeded: expiredSessions > 0
    };
  }
}

export const sessionService = new SessionService();
