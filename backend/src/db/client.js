import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';

let prisma;

// Database connection with singleton pattern
export const db = (() => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug('Database Query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log database events
    prisma.$on('info', (e) => {
      logger.info('Database Info', { message: e.message });
    });

    prisma.$on('warn', (e) => {
      logger.warn('Database Warning', { message: e.message });
    });

    prisma.$on('error', (e) => {
      logger.error('Database Error', { message: e.message });
    });

    logger.info('Database client initialized');
  }

  return prisma;
})();

// Database connection test
export const testConnection = async () => {
  try {
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
};

// Graceful shutdown
export const disconnectDb = async () => {
  try {
    await db.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database', { error: error.message });
  }
};

// Database health check
export const getDbHealth = async () => {
  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

export default db;