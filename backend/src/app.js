import express from 'express';
import cors from 'cors';
import { logger } from './lib/logger.js';
import { getEnv } from './config/env.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import llmRouter from './routes/llm.js';
import pricesRouter from './routes/prices.js';

export function createServer() {
  const app = express();
  const env = getEnv();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV || 'development' });
  });

  app.use('/api/orders', ordersRouter);
  app.use('/webhooks', paymentsRouter);
  app.use('/api/llm', llmRouter);
  app.use('/api/prices', pricesRouter);

  // Fallback 404
  app.use((req, res) => {
    logger.warn(`Not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

