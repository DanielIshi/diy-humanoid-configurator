import { Router } from 'express';
import { getEnv } from '../config/env.js';

const router = Router();

router.post('/proxy', async (req, res) => {
  const { OPENAI_API_KEY, OPENROUTER_API_KEY } = getEnv();
  if (!OPENAI_API_KEY && !OPENROUTER_API_KEY) {
    return res.status(501).json({ error: 'LLM proxy not configured' });
  }
  
  try {
    const { messages, model, provider, settings = {} } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Provider auswählen basierend auf Verfügbarkeit
    let selectedProvider = provider || (OPENROUTER_API_KEY ? 'openrouter' : 'openai');
    
    // Weiterleitung an AI Service
    const aiResponse = await fetch('http://localhost:3001/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({
        message: messages[messages.length - 1]?.content || '',
        chatHistory: messages.slice(0, -1),
        context: settings
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      return res.status(aiResponse.status).json(errorData);
    }

    const result = await aiResponse.json();
    
    // Proxy Response Format anpassen
    return res.json({
      ok: true,
      provider: result.metadata.provider,
      model: result.metadata.model,
      response: result.response,
      tokens: result.metadata.tokens,
      timestamp: result.metadata.timestamp
    });

  } catch (error) {
    console.error('LLM Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Proxy request failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

