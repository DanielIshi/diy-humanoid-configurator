import { Router } from 'express';
import { logger } from '../lib/logger.js';

const router = Router();

// NOTE: Real Stripe webhook verification requires raw body parsing.
// This stub accepts JSON and logs the event for Phase 1 integration.
router.post('/stripe', (req, res) => {
  const event = req.body || {};
  logger.info('Received Stripe webhook (stub):', event.type || 'unknown');
  // TODO: verify signature with STRIPE_WEBHOOK_SECRET and update order status
  res.json({ received: true, type: event.type || null });
});

export default router;

