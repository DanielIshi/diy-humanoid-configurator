import crypto from 'node:crypto';

const orders = new Map();

export function listOrders() {
  return Array.from(orders.values());
}

export function getOrder(id) {
  return orders.get(id) || null;
}

export function createOrder(payload) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const order = {
    id,
    status: 'created',
    items: payload.items || [],
    totals: payload.totals || { net: 0, gross: 0, currency: 'EUR' },
    customer: payload.customer || null,
    createdAt: now,
    updatedAt: now,
  };
  orders.set(id, order);
  return order;
}

export function updateOrder(id, patch) {
  const current = orders.get(id);
  if (!current) return null;
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  orders.set(id, updated);
  return updated;
}

