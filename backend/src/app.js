import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { logger } from './lib/logger.js';
import { getEnv } from './config/env.js';

// Middleware imports
import corsMiddleware from './middleware/cors.js';
import { security, rateLimiter } from './middleware/security.js';
import { errorHandler, notFound, asyncHandler } from './middleware/error.js';

// Route imports
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import llmRouter from './routes/llm.js';
import pricesRouter from './routes/prices.js';
import productsRouter from './routes/products.js';
import configRouter from './routes/config.js';
import adminRouter from './routes/admin.js';

export function createServer() {
  const app = express();
  const env = getEnv();

  // Trust proxy for rate limiting and IP detection
  app.set('trust proxy', 1);

  // Security middleware
  app.use(security);
  
  // CORS middleware
  app.use(corsMiddleware);
  
  // Request logging
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
  
  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  
  // Rate limiting (apply to all requests)
  app.use(rateLimiter);

  // Health check endpoint
  app.get('/health', asyncHandler(async (req, res) => {
    const { getDbHealth } = await import('./db/client.js');
    const dbHealth = await getDbHealth();
    
    const isHealthy = dbHealth.status === 'healthy';
    const statusCode = isHealthy ? 200 : 503;
    
    res.status(statusCode).json({ 
      success: isHealthy,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth,
      uptime: process.uptime()
    });
  }));

  // API routes
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/config', configRouter);
  app.use('/api/llm', llmRouter);
  app.use('/api/prices', pricesRouter);
  
  // Admin routes (protected)
  app.use('/admin', adminRouter);
  
  // Webhook routes (no auth required)
  app.use('/webhooks', paymentsRouter);

  // 404 handler
  app.use(notFound);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

