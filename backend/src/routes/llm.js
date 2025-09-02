import { Router } from 'express';
import { getEnv } from '../config/env.js';

const router = Router();

router.post('/proxy', async (req, res) => {
  const { OPENAI_API_KEY, OPENROUTER_API_KEY } = getEnv();
  if (!OPENAI_API_KEY && !OPENROUTER_API_KEY) {
    return res.status(501).json({ error: 'LLM proxy not configured' });
  }
  // Stub: do not forward requests yet.
  return res.json({ ok: true, provider: OPENROUTER_API_KEY ? 'openrouter' : 'openai' });
});

export default router;

