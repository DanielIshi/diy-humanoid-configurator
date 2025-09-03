import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import pricesRouter from './routes/prices.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/prices', pricesRouter);

// OpenAI/OpenRouter clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const openrouter = process.env.OPENROUTER_API_KEY ? new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
}) : null;

// Rate limiting (simple in-memory)
const rateLimits = new Map();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 0, resetTime: now + RATE_WINDOW });
  }
  
  const limit = rateLimits.get(ip);
  if (now > limit.resetTime) {
    limit.count = 0;
    limit.resetTime = now + RATE_WINDOW;
  }
  
  if (limit.count >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded. Bitte warte eine Minute.');
  }
  
  limit.count++;
  return true;
}

// LLM Proxy endpoint
app.post('/api/llm/proxy', async (req, res) => {
  try {
    const ip = req.ip || 'unknown';
    checkRateLimit(ip);
    
    const { messages, provider = 'auto', settings = {} } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    if (!openai && !openrouter) {
      return res.status(501).json({ error: 'Keine AI-API konfiguriert. Bitte OPENAI_API_KEY oder OPENROUTER_API_KEY in .env setzen.' });
    }

    let response;
    let usedProvider;

    // Versuche verfügbaren Provider
    if (provider === 'auto' || provider === 'openai') {
      if (openai) {
        try {
          response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          });
          usedProvider = 'openai';
        } catch (error) {
          console.error('OpenAI error:', error);
          if (!openrouter) throw error;
          // Fallback zu OpenRouter
          response = await openrouter.chat.completions.create({
            model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          });
          usedProvider = 'openrouter';
        }
      } else if (openrouter) {
        response = await openrouter.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        });
        usedProvider = 'openrouter';
      }
    } else if (provider === 'openrouter' && openrouter) {
      response = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });
      usedProvider = 'openrouter';
    } else {
      return res.status(400).json({ error: `Provider ${provider} nicht verfügbar` });
    }

    // Antwort formatieren
    return res.json({
      ok: true,
      provider: usedProvider,
      model: usedProvider === 'openai' 
        ? (process.env.OPENAI_MODEL || 'gpt-3.5-turbo')
        : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'),
      response: response.choices[0]?.message?.content || 'Keine Antwort erhalten',
      tokens: response.usage?.total_tokens || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LLM Proxy Error:', error);
    
    if (error.message?.includes('Rate limit exceeded')) {
      return res.status(429).json({ 
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    return res.status(500).json({ 
      error: 'Proxy request failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Chat endpoint (vollständiger Chat-Service)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const ip = req.ip || 'unknown';
    checkRateLimit(ip);
    
    const { 
      message, 
      chatHistory = [], 
      currentConfiguration = null,
      context = {}
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Nachricht ist erforderlich',
        code: 'MISSING_MESSAGE'
      });
    }

    if (!openai && !openrouter) {
      return res.status(501).json({ 
        error: 'Keine AI-API konfiguriert. Bitte OPENAI_API_KEY oder OPENROUTER_API_KEY in .env setzen.' 
      });
    }

    // System prompt für Produktberater
    const systemMessage = {
      role: 'system',
      content: `Du bist ein erfahrener Robotik-Experte und Produktberater für DIY Humanoid Roboter.

DEINE AUFGABEN:
- Beratung zu Roboter-Komponenten und Konfigurationen
- Kompatibilitätsprüfung zwischen Bauteilen
- Preisoptimierung und Budget-Empfehlungen
- Schwierigkeitsgrad-Einschätzung
- Sicherheitshinweise und Best Practices

ANTWORTSTIL:
- Präzise, technisch fundiert, aber verständlich
- Strukturierte Antworten mit klaren Empfehlungen
- Berücksichtigung von Budget und Skill-Level
- Deutsche Sprache, Du-Ansprache
- Kurze, prägnante Antworten (max 200 Wörter)

${currentConfiguration ? `\nAKTUELLE KONFIGURATION:\n${JSON.stringify(currentConfiguration, null, 2)}` : ''}
${context.budget ? `\nNUTZER BUDGET: €${context.budget}` : ''}
${context.skillLevel ? `\nNUTZER SKILL-LEVEL: ${context.skillLevel}` : ''}`
    };

    // Messages zusammenstellen
    const messages = [
      systemMessage,
      ...chatHistory.slice(-10),
      { role: 'user', content: message }
    ];

    let response;
    let usedProvider;

    // Provider-Auswahl mit Fallback
    if (openai) {
      try {
        response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        });
        usedProvider = 'openai';
      } catch (error) {
        console.error('OpenAI error:', error);
        if (openrouter) {
          response = await openrouter.chat.completions.create({
            model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          });
          usedProvider = 'openrouter';
        } else {
          throw error;
        }
      }
    } else if (openrouter) {
      response = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });
      usedProvider = 'openrouter';
    }

    res.json({
      success: true,
      response: response.choices[0]?.message?.content || 'Keine Antwort erhalten',
      metadata: {
        provider: usedProvider,
        model: usedProvider === 'openai' 
          ? (process.env.OPENAI_MODEL || 'gpt-3.5-turbo')
          : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'),
        tokens: response.usage?.total_tokens || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    
    if (error.message?.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Fehler beim Verarbeiten der Chat-Anfrage',
      code: 'CHAT_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      openai: !!openai,
      openrouter: !!openrouter
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple AI Server läuft auf http://localhost:${PORT}`);
  console.log(`📊 Services: OpenAI=${!!openai}, OpenRouter=${!!openrouter}`);
  console.log(`🔐 Rate Limit: ${RATE_LIMIT} req/min`);
});