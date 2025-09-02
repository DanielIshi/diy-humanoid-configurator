# DIY Humanoid Configurator — Backend

Minimal Node/Express scaffold for Phase 2 features: orders, payments (webhook stub), LLM proxy (stub), and price lookup (stub).

## Quickstart

1. cd backend
2. Copy `.env.example` to `.env` and adjust values
3. npm install
4. npm run dev

Server runs on `http://localhost:3001` by default.

## Endpoints

- `GET /health` — service status
- `GET /api/orders` — list in-memory orders
- `POST /api/orders` — create order `{ items: [], totals?, customer? }`
- `GET /api/orders/:id` — fetch order
- `POST /webhooks/stripe` — Stripe webhook stub (expects JSON)
- `POST /api/llm/proxy` — LLM proxy stub (checks env keys)
- `GET /api/prices?q=servo` — price search stub

## Notes

- Webhook verification: switch to raw-body parsing for Stripe signature verification before production.
- Database: replace in-memory store with PostgreSQL (e.g., via Prisma or `pg`).
- LLM: forward to OpenAI or OpenRouter from the backend; never expose keys to the client.
- Scraping: implement vendor API clients or Puppeteer workers behind a queue.

