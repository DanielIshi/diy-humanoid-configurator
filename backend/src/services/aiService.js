// AI Service für LLM-basierte Features
// Integration von OpenAI und OpenRouter APIs mit Fallback-Mechanismus

const OpenAI = require('openai');
const logger = require('../lib/logger');
const { redis } = require('./cacheService');
const db = require('../db/client');

class AIService {
  constructor() {
    // OpenAI Client initialisieren
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // OpenRouter Client als Fallback
    this.openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    // Konfiguration
    this.config = {
      openai: {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      },
      openrouter: {
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free',
        maxTokens: 1000,
      },
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 40000,
      },
      cache: {
        ttl: 3600, // 1 Stunde
      }
    };

    // Token Usage Tracking
    this.tokenUsage = {
      total: 0,
      byUser: new Map(),
      resetTime: Date.now() + 60000, // Reset jede Minute
    };

    // Prompt Templates
    this.prompts = {
      systemProductAdvisor: `Du bist ein erfahrener Robotik-Experte und Produktberater für DIY Humanoid Roboter.

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

      systemComposer: `Du bist ein AI-Kompositions-Assistent für DIY Roboter-Konfigurationen.

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
}`,

      systemManualGenerator: `Du bist ein AI-Assistent für die Erstellung personalisierter Bauanleitungen.

AUFGABEN:
- Generiere Schritt-für-Schritt Anleitungen
- Passe Schwierigkeitsgrad an Nutzer an
- Erkenne kritische Schritte und Sicherheitsrisiken
- Schlage alternative Lösungswege vor
- Erstelle Troubleshooting-Tipps

FORMAT:
Jeder Schritt sollte enthalten:
- Klare, nummerierte Anweisungen
- Benötigte Werkzeuge und Materialien
- Schwierigkeitsgrad (1-5 Sterne)
- Sicherheitshinweise bei kritischen Schritten
- Tipps für häufige Probleme
- Geschätzte Zeit
- Qualitätsprüfung`
    };
  }

  /**
   * Rate Limiting prüfen
   */
  async checkRateLimit(userId) {
    const now = Date.now();
    
    // Reset Counter wenn nötig
    if (now > this.tokenUsage.resetTime) {
      this.tokenUsage.total = 0;
      this.tokenUsage.byUser.clear();
      this.tokenUsage.resetTime = now + 60000;
    }

    const userUsage = this.tokenUsage.byUser.get(userId) || 0;
    
    if (userUsage > this.config.rateLimit.requestsPerMinute) {
      throw new Error('Rate limit exceeded. Bitte warte eine Minute.');
    }

    return true;
  }

  /**
   * Token Usage tracken
   */
  trackTokenUsage(userId, tokens) {
    this.tokenUsage.total += tokens;
    const userUsage = this.tokenUsage.byUser.get(userId) || 0;
    this.tokenUsage.byUser.set(userId, userUsage + 1);
  }

  /**
   * Cache Key generieren
   */
  getCacheKey(type, params) {
    const paramsHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `ai:${type}:${paramsHash}`;
  }

  /**
   * Chat Completion mit Fallback
   */
  async chatCompletion(messages, options = {}) {
    const {
      userId = 'anonymous',
      useCache = true,
      provider = 'auto', // 'openai', 'openrouter', 'auto'
      stream = false
    } = options;

    try {
      // Rate Limiting prüfen
      await this.checkRateLimit(userId);

      // Cache prüfen
      const cacheKey = this.getCacheKey('chat', { messages, provider });
      if (useCache && !stream) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('AI Cache Hit', { userId, cacheKey });
          return JSON.parse(cached);
        }
      }

      let response;
      let usedProvider = provider;

      // Provider-Auswahl
      if (provider === 'auto' || provider === 'openai') {
        try {
          response = await this.openai.chat.completions.create({
            model: this.config.openai.model,
            messages,
            max_tokens: this.config.openai.maxTokens,
            temperature: 0.7,
            stream
          });
          usedProvider = 'openai';
        } catch (error) {
          if (provider === 'openai') throw error;
          
          logger.warn('OpenAI failed, falling back to OpenRouter', { 
            error: error.message,
            userId 
          });
          
          // Fallback zu OpenRouter
          response = await this.openrouter.chat.completions.create({
            model: this.config.openrouter.model,
            messages,
            max_tokens: this.config.openrouter.maxTokens,
            temperature: 0.7,
            stream
          });
          usedProvider = 'openrouter';
        }
      } else if (provider === 'openrouter') {
        response = await this.openrouter.chat.completions.create({
          model: this.config.openrouter.model,
          messages,
          max_tokens: this.config.openrouter.maxTokens,
          temperature: 0.7,
          stream
        });
      }

      // Streaming Response
      if (stream) {
        return response; // Stream wird direkt zurückgegeben
      }

      // Token Usage tracken
      const tokens = response.usage?.total_tokens || 0;
      this.trackTokenUsage(userId, tokens);

      const result = {
        content: response.choices[0]?.message?.content,
        provider: usedProvider,
        model: usedProvider === 'openai' ? this.config.openai.model : this.config.openrouter.model,
        tokens: tokens,
        timestamp: new Date().toISOString()
      };

      // Cachen
      if (useCache) {
        await redis.setex(cacheKey, this.config.cache.ttl, JSON.stringify(result));
      }

      logger.info('AI Completion Success', {
        userId,
        provider: usedProvider,
        tokens,
        cacheKey
      });

      return result;

    } catch (error) {
      logger.error('AI Completion Error', {
        error: error.message,
        userId,
        provider
      });
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Produktberatung Chat
   */
  async productAdvisorChat(userMessage, context = {}) {
    const {
      userId,
      chatHistory = [],
      userProfile = {},
      currentConfiguration = null
    } = context;

    // System Message mit Kontext
    const systemMessage = {
      role: 'system',
      content: this.prompts.systemProductAdvisor + 
        (currentConfiguration ? `\n\nAKTUELLE KONFIGURATION:\n${JSON.stringify(currentConfiguration, null, 2)}` : '') +
        (userProfile.skillLevel ? `\n\nNUTZER SKILL-LEVEL: ${userProfile.skillLevel}` : '') +
        (userProfile.budget ? `\n\nNUTZER BUDGET: €${userProfile.budget}` : '')
    };

    // Message History zusammenstellen
    const messages = [
      systemMessage,
      ...chatHistory.slice(-10), // Nur letzte 10 Nachrichten für Context
      { role: 'user', content: userMessage }
    ];

    return await this.chatCompletion(messages, { userId });
  }

  /**
   * Automatische Konfigurationserstellung
   */
  async composeConfiguration(requirements) {
    const {
      description,
      budget = null,
      skillLevel = 'beginner',
      useCase = 'general',
      userId = 'anonymous'
    } = requirements;

    const systemMessage = {
      role: 'system',
      content: this.prompts.systemComposer
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

    const response = await this.chatCompletion([systemMessage, userMessage], { userId });
    
    try {
      // JSON aus Response extrahieren
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const configuration = JSON.parse(jsonMatch[0]);
        
        // Konfiguration in Datenbank speichern
        await this.saveGeneratedConfiguration(userId, configuration);
        
        return {
          success: true,
          configuration,
          provider: response.provider,
          tokens: response.tokens
        };
      }
      
      throw new Error('Keine gültige JSON-Konfiguration gefunden');
      
    } catch (error) {
      logger.error('Configuration Composition Error', {
        error: error.message,
        userId,
        response: response.content
      });
      
      return {
        success: false,
        error: 'Fehler beim Generieren der Konfiguration',
        rawResponse: response.content
      };
    }
  }

  /**
   * Kompatibilitätsprüfung
   */
  async checkCompatibility(components) {
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

    const response = await this.chatCompletion([systemMessage, userMessage]);
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Compatibility Check Parse Error', { error: error.message });
    }

    return {
      compatible: null,
      issues: ['Fehler bei der Kompatibilitätsprüfung'],
      recommendations: [],
      confidence: 0
    };
  }

  /**
   * Manual-Generierung
   */
  async generateManual(configuration, userLevel = 'beginner') {
    const systemMessage = {
      role: 'system',
      content: this.prompts.systemManualGenerator +
        `\n\nNUTZER SKILL-LEVEL: ${userLevel}\nPasse die Anleitungen entsprechend an.`
    };

    const userMessage = {
      role: 'user',
      content: `Erstelle eine Bauanleitung für diese Konfiguration:\n\n${JSON.stringify(configuration, null, 2)}`
    };

    return await this.chatCompletion([systemMessage, userMessage]);
  }

  /**
   * Konfiguration in DB speichern
   */
  async saveGeneratedConfiguration(userId, configuration) {
    try {
      const saved = await db.aiConfiguration.create({
        data: {
          userId: userId !== 'anonymous' ? userId : null,
          name: configuration.configuration?.name || 'AI Generated',
          configuration: configuration,
          provider: 'ai-generated',
          createdAt: new Date()
        }
      });
      
      logger.info('AI Configuration Saved', { 
        id: saved.id, 
        userId, 
        name: saved.name 
      });
      
      return saved;
    } catch (error) {
      logger.error('Save AI Configuration Error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Chat-Historie laden
   */
  async getChatHistory(userId, limit = 50) {
    try {
      const history = await db.aiChatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return history.reverse(); // Chronologische Reihenfolge
    } catch (error) {
      logger.error('Get Chat History Error', { error: error.message, userId });
      return [];
    }
  }

  /**
   * Chat-Nachricht speichern
   */
  async saveChatMessage(userId, role, content, metadata = {}) {
    try {
      const message = await db.aiChatMessage.create({
        data: {
          userId,
          role,
          content,
          metadata,
          createdAt: new Date()
        }
      });

      return message;
    } catch (error) {
      logger.error('Save Chat Message Error', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Usage Statistics
   */
  async getUsageStats(userId = null) {
    const stats = {
      totalRequests: this.tokenUsage.total,
      activeUsers: this.tokenUsage.byUser.size,
      resetTime: new Date(this.tokenUsage.resetTime).toISOString()
    };

    if (userId) {
      stats.userRequests = this.tokenUsage.byUser.get(userId) || 0;
    }

    return stats;
  }

  /**
   * Service Health Check
   */
  async healthCheck() {
    const results = {
      openai: false,
      openrouter: false,
      cache: false,
      database: false
    };

    // OpenAI Test
    try {
      await this.openai.models.list();
      results.openai = true;
    } catch (error) {
      logger.warn('OpenAI Health Check Failed', { error: error.message });
    }

    // OpenRouter Test
    try {
      await this.openrouter.models.list();
      results.openrouter = true;
    } catch (error) {
      logger.warn('OpenRouter Health Check Failed', { error: error.message });
    }

    // Cache Test
    try {
      await redis.ping();
      results.cache = true;
    } catch (error) {
      logger.warn('Redis Health Check Failed', { error: error.message });
    }

    // Database Test
    try {
      await db.$queryRaw`SELECT 1`;
      results.database = true;
    } catch (error) {
      logger.warn('Database Health Check Failed', { error: error.message });
    }

    return {
      status: Object.values(results).some(r => r) ? 'partial' : 'down',
      services: results,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AIService();