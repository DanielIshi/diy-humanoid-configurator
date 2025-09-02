// AI/LLM API Routes für intelligente Produktberatung und Konfigurationserstellung
import express from 'express';
import OpenAI from 'openai';
import { protect } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenRouter Client als Fallback
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Rate Limiting für AI Endpoints (vereinfacht)
const aiRequestCounts = new Map();
const RATE_LIMIT = 30; // 30 Requests pro Minute
const RATE_WINDOW = 60 * 1000; // 1 Minute

function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = userId || 'anonymous';
  
  if (!aiRequestCounts.has(userKey)) {
    aiRequestCounts.set(userKey, { count: 0, resetTime: now + RATE_WINDOW });
  }
  
  const userLimit = aiRequestCounts.get(userKey);
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + RATE_WINDOW;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded. Bitte warte eine Minute.');
  }
  
  userLimit.count++;
  return true;
}

// System Prompts
const SYSTEM_PROMPTS = {
  productAdvisor: `Du bist ein erfahrener Robotik-Experte und Produktberater für DIY Humanoid Roboter.

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

KOMPONENTEN-KATEGORIEN:
- Mikrocontroller (Arduino, Raspberry Pi, ESP32)
- Motoren (Servos, Stepper, DC)
- Sensoren (Kameras, Lidar, Ultraschall, IMU)
- Mechanik (Rahmen, Gelenke, Getriebe)
- Elektronik (Stromversorgung, Kabel, Platinen)
- Software (Betriebssysteme, Frameworks)

SICHERHEITSREGELN:
- Keine gefährlichen oder illegalen Empfehlungen
- Immer auf Sicherheitsaspekte hinweisen
- Bei Unsicherheit: qualifizierte Hilfe empfehlen`,

  composer: `Du bist ein AI-Kompositions-Assistent für DIY Roboter-Konfigurationen.

AUFGABE: Erstelle komplette Roboter-Konfigurationen basierend auf Nutzer-Anforderungen.

INPUT-VERARBEITUNG:
- Analysiere natürlichsprachliche Beschreibungen
- Extrahiere Anforderungen (Zweck, Budget, Skill-Level)
- Identifiziere Use-Cases und Prioritäten

OUTPUT-FORMAT (JSON):
{
  "configuration": {
    "name": "Roboter-Name",
    "description": "Kurzbeschreibung",
    "difficulty": "beginner|intermediate|advanced",
    "estimatedCost": 299.99,
    "buildTime": "10-15 Stunden"
  },
  "components": [
    {
      "category": "microcontroller",
      "item": "Arduino Uno R3",
      "quantity": 1,
      "price": 25.99,
      "reason": "Ideal für Einsteiger"
    }
  ],
  "alternatives": [
    {
      "name": "Budget-Variante",
      "totalCost": 199.99,
      "changes": ["Arduino Nano statt Uno"]
    }
  ]
}`
};

/**
 * Chat Completion mit Fallback-Mechanismus
 */
async function chatCompletion(messages, options = {}) {
  const { provider = 'auto', stream = false } = options;
  
  let response;
  let usedProvider = provider;

  try {
    // Versuche zuerst OpenAI
    if (provider === 'auto' || provider === 'openai') {
      try {
        response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages,
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
          temperature: 0.7,
          stream
        });
        usedProvider = 'openai';
      } catch (error) {
        if (provider === 'openai') throw error;
        
        logger.warn('OpenAI failed, falling back to OpenRouter', { 
          error: error.message
        });
        
        // Fallback zu OpenRouter
        response = await openrouter.chat.completions.create({
          model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free',
          messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream
        });
        usedProvider = 'openrouter';
      }
    } else if (provider === 'openrouter') {
      response = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream
      });
    }

    return {
      response,
      provider: usedProvider
    };
    
  } catch (error) {
    logger.error('AI Chat Completion Error', { error: error.message });
    throw new Error(`AI Service Error: ${error.message}`);
  }
}

/**
 * POST /api/ai/chat
 * Produktberater Chat mit Context-Management
 */
router.post('/chat', async (req, res) => {
  try {
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

    const userId = req.user?.id || 'anonymous';
    
    // Rate Limiting prüfen
    checkRateLimit(userId);

    // System Message mit Kontext
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPTS.productAdvisor + 
        (currentConfiguration ? `\n\nAKTUELLE KONFIGURATION:\n${JSON.stringify(currentConfiguration, null, 2)}` : '') +
        (req.user?.profile?.skillLevel ? `\n\nNUTZER SKILL-LEVEL: ${req.user.profile.skillLevel}` : '') +
        (context.budget ? `\n\nNUTZER BUDGET: €${context.budget}` : '')
    };

    // Message History zusammenstellen
    const messages = [
      systemMessage,
      ...chatHistory.slice(-10), // Nur letzte 10 Nachrichten für Context
      { role: 'user', content: message }
    ];

    const { response, provider } = await chatCompletion(messages);
    
    const result = {
      success: true,
      response: response.choices[0]?.message?.content || 'Keine Antwort erhalten',
      metadata: {
        provider,
        model: provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-3.5-turbo') : (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free'),
        tokens: response.usage?.total_tokens || 0,
        timestamp: new Date().toISOString()
      }
    };

    res.json(result);

    // Analytics
    logger.info('AI Chat Completion', {
      userId,
      messageLength: message.length,
      provider,
      tokens: response.usage?.total_tokens || 0,
      hasConfiguration: !!currentConfiguration
    });

  } catch (error) {
    logger.error('AI Chat Error', {
      error: error.message,
      userId: req.user?.id,
      stack: error.stack
    });

    if (error.message.includes('Rate limit exceeded')) {
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

/**
 * POST /api/ai/compose
 * Automatische Konfigurationserstellung
 */
router.post('/compose', async (req, res) => {
  try {
    const {
      description,
      budget,
      skillLevel = 'beginner',
      useCase = 'general'
    } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        error: 'Beschreibung ist erforderlich',
        code: 'MISSING_DESCRIPTION'
      });
    }

    const userId = req.user?.id || 'anonymous';
    
    // Rate Limiting prüfen
    checkRateLimit(userId);

    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPTS.composer
    };

    const userMessage = {
      role: 'user',
      content: `Erstelle eine Roboter-Konfiguration mit folgenden Anforderungen:

BESCHREIBUNG: ${description}
BUDGET: ${budget ? `€${budget}` : 'Flexibel'}  
SKILL-LEVEL: ${skillLevel}
USE-CASE: ${useCase}

Bitte erstelle eine vollständige Konfiguration im JSON-Format mit passenden Komponenten, Preisschätzung und mindestens 2 Alternativen.`
    };

    const { response, provider } = await chatCompletion([systemMessage, userMessage]);
    const responseContent = response.choices[0]?.message?.content || '';
    
    try {
      // JSON aus Response extrahieren
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const configuration = JSON.parse(jsonMatch[0]);
        
        res.json({
          success: true,
          configuration,
          metadata: {
            provider,
            tokens: response.usage?.total_tokens || 0,
            generatedAt: new Date().toISOString()
          }
        });

        logger.info('AI Configuration Composed', {
          userId,
          budget,
          skillLevel,
          useCase,
          provider,
          tokens: response.usage?.total_tokens || 0
        });
        
      } else {
        throw new Error('Keine gültige JSON-Konfiguration gefunden');
      }
      
    } catch (parseError) {
      logger.error('Configuration Parse Error', {
        error: parseError.message,
        userId,
        response: responseContent
      });
      
      res.status(422).json({
        success: false,
        error: 'Fehler beim Generieren der Konfiguration',
        rawResponse: responseContent
      });
    }

  } catch (error) {
    logger.error('AI Compose Error', {
      error: error.message,
      userId: req.user?.id
    });

    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Fehler beim Generieren der Konfiguration',
      code: 'COMPOSE_ERROR'
    });
  }
});

/**
 * POST /api/ai/compatibility
 * Kompatibilitätsprüfung zwischen Komponenten
 */
router.post('/compatibility', async (req, res) => {
  try {
    const { components } = req.body;

    if (!components || !Array.isArray(components) || components.length < 2) {
      return res.status(400).json({
        error: 'Mindestens 2 Komponenten erforderlich',
        code: 'INSUFFICIENT_COMPONENTS'
      });
    }

    const userId = req.user?.id || 'anonymous';
    checkRateLimit(userId);

    const systemMessage = {
      role: 'system',
      content: `Du bist ein Experte für Roboter-Komponenten-Kompatibilität.

Analysiere die gegebenen Komponenten auf:
- Technische Kompatibilität (Spannungen, Interfaces, etc.)
- Mechanische Passung
- Software-Kompatibilität
- Mögliche Konflikte oder Probleme

Antworte im JSON-Format:
{
  "compatible": true/false,
  "issues": ["Problem 1", "Problem 2"],
  "recommendations": ["Empfehlung 1", "Empfehlung 2"],
  "confidence": 0.85
}`
    };

    const userMessage = {
      role: 'user',
      content: `Prüfe die Kompatibilität dieser Komponenten:\n\n${JSON.stringify(components, null, 2)}`
    };

    const { response, provider } = await chatCompletion([systemMessage, userMessage]);
    const responseContent = response.choices[0]?.message?.content || '';
    
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const compatibility = JSON.parse(jsonMatch[0]);
        
        res.json({
          success: true,
          compatibility,
          components: components.length,
          timestamp: new Date().toISOString()
        });

        logger.info('AI Compatibility Check', {
          userId,
          componentCount: components.length,
          compatible: compatibility.compatible,
          confidence: compatibility.confidence
        });
      } else {
        throw new Error('Keine gültige JSON-Antwort');
      }
    } catch (parseError) {
      res.json({
        success: true,
        compatibility: {
          compatible: null,
          issues: ['Fehler bei der Kompatibilitätsprüfung'],
          recommendations: [],
          confidence: 0
        },
        rawResponse: responseContent
      });
    }

  } catch (error) {
    logger.error('AI Compatibility Error', { error: error.message });
    
    if (error.message.includes('Rate limit exceeded')) {
      return res.status(429).json({
        error: error.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    res.status(500).json({
      error: 'Fehler bei der Kompatibilitätsprüfung',
      code: 'COMPATIBILITY_ERROR'
    });
  }
});

/**
 * GET /api/ai/health
 * AI Service Health Check
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      services: {
        openai: false,
        openrouter: false
      },
      timestamp: new Date().toISOString()
    };

    // OpenAI Test
    try {
      await openai.models.list();
      health.services.openai = true;
    } catch (error) {
      logger.warn('OpenAI Health Check Failed', { error: error.message });
    }

    // OpenRouter Test
    try {
      // Einfacher Test ohne teure API Calls
      if (process.env.OPENROUTER_API_KEY) {
        health.services.openrouter = true;
      }
    } catch (error) {
      logger.warn('OpenRouter Health Check Failed', { error: error.message });
    }

    // Status bestimmen
    const anyServiceWorking = Object.values(health.services).some(service => service);
    health.status = anyServiceWorking ? 'ok' : 'degraded';
    
    const statusCode = anyServiceWorking ? 200 : 503;
    
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('AI Health Check Error', { error: error.message });
    res.status(503).json({
      status: 'error',
      error: 'Health Check fehlgeschlagen',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/ai/usage
 * Nutzungsstatistiken für angemeldete Nutzer
 */
router.get('/usage', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRequests = aiRequestCounts.get(userId);
    
    const stats = {
      userId,
      currentPeriod: {
        requests: userRequests?.count || 0,
        limit: RATE_LIMIT,
        resetTime: userRequests?.resetTime || Date.now() + RATE_WINDOW
      },
      rateLimit: {
        windowMs: RATE_WINDOW,
        maxRequests: RATE_LIMIT
      }
    };

    res.json({
      success: true,
      usage: stats
    });

  } catch (error) {
    logger.error('AI Usage Stats Error', { error: error.message });
    res.status(500).json({
      error: 'Fehler beim Laden der Nutzungsstatistiken',
      code: 'USAGE_ERROR'
    });
  }
});

export default router;