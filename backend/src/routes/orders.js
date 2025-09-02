import { Router } from 'express';
import { createOrder, getOrder, listOrders } from '../db/memory.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ orders: listOrders() });
});

router.post('/', (req, res) => {
  const { items, totals, customer } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }
  const order = createOrder({ items, totals, customer });
  res.status(201).json({ order });
});

router.get('/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  res.json({ order });
});

export default router;

