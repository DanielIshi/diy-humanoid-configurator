// REST API Endpoints für AI-Manual-Compiler-System
// Handles vorkompilierte Bauanleitungen-Generierung und -Verwaltung

const express = require('express');
const router = express.Router();
const { logger } = require('../lib/logger');
const aiManualCompiler = require('../services/aiManualCompiler');
const pdfGenerator = require('../services/pdfGenerator');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const db = require('../db/client');

// Rate Limiting für AI-Manual-Generierung
const manualGenerationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 5, // Max 5 Manual-Generierungen pro Stunde pro IP
  message: {
    error: 'Zu viele Manual-Generierungen. Bitte warten Sie eine Stunde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation Schemas
const generateManualSchema = {
  type: 'object',
  required: ['orderId', 'components'],
  properties: {
    orderId: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    components: {
      type: 'object',
      minProperties: 1
    },
    customerName: {
      type: 'string',
      maxLength: 100
    },
    userSkillLevel: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced']
    },
    totalPrice: {
      type: 'number',
      minimum: 0
    },
    options: {
      type: 'object',
      properties: {
        includeImages: { type: 'boolean' },
        includeVideos: { type: 'boolean' },
        format: { type: 'string', enum: ['pdf', 'html', 'markdown'] },
        language: { type: 'string', enum: ['de-DE', 'en-US'] }
      }
    }
  }
};

const generatePDFSchema = {
  type: 'object',
  required: ['manualId'],
  properties: {
    manualId: {
      type: 'string',
      minLength: 1
    },
    options: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['A4', 'Letter', 'A3'] },
        includeImages: { type: 'boolean' },
        includeTableOfContents: { type: 'boolean' },
        watermark: { type: 'boolean' }
      }
    }
  }
};

/**
 * POST /api/ai-manual/generate
 * Generiert vorkompilierte AI-Bauanleitung für Bestellung
 */
router.post('/generate', 
  manualGenerationLimit,
  requireAuth,
  validateRequest(generateManualSchema),
  async (req, res) => {
    const { orderId, components, customerName, userSkillLevel, totalPrice, options = {} } = req.body;
    const userId = req.user.id;

    logger.info('AI-Manual-Generierung angefragt', {
      userId,
      orderId,
      componentCount: Object.keys(components).length,
      skillLevel: userSkillLevel
    });

    try {
      // Prüfe ob Manual bereits existiert
      const existingManual = await db.aiManual.findFirst({
        where: {
          orderId: orderId,
          userId: userId
        }
      });

      if (existingManual && !options.forceRegenerate) {
        logger.info('Existierendes Manual gefunden', { 
          manualId: existingManual.id,
          orderId 
        });
        
        return res.status(200).json({
          success: true,
          manual: existingManual,
          message: 'Manual bereits vorhanden',
          cached: true
        });
      }

      // Konfiguration für AI-Compiler vorbereiten
      const orderConfiguration = {
        orderId,
        components,
        customerName: customerName || req.user.name || 'Kunde',
        userSkillLevel: userSkillLevel || 'beginner',
        totalPrice,
        userId,
        options: {
          language: options.language || 'de-DE',
          includeImages: options.includeImages !== false,
          includeVideos: options.includeVideos || false,
          format: options.format || 'comprehensive'
        }
      };

      // AI-Manual-Kompilierung starten
      const aiManual = await aiManualCompiler.generateAICompiledManual(orderConfiguration);

      // Manual in Datenbank speichern
      const savedManual = await db.aiManual.create({
        data: {
          id: aiManual.id,
          userId: userId,
          orderId: orderId,
          title: aiManual.metadata.title,
          robotType: aiManual.metadata.robotType,
          difficulty: aiManual.metadata.difficulty,
          estimatedBuildTime: aiManual.metadata.estimatedBuildTime?.total || 480,
          language: aiManual.metadata.language,
          content: aiManual,
          generatedAt: new Date(aiManual.metadata.generated),
          aiTokensUsed: aiManual.metadata.aiTokensUsed || 0,
          status: 'completed'
        }
      });

      logger.info('AI-Manual erfolgreich generiert und gespeichert', {
        manualId: savedManual.id,
        userId,
        orderId,
        tokens: aiManual.metadata.aiTokensUsed
      });

      res.status(201).json({
        success: true,
        manual: {
          id: savedManual.id,
          title: savedManual.title,
          robotType: savedManual.robotType,
          difficulty: savedManual.difficulty,
          estimatedBuildTime: savedManual.estimatedBuildTime,
          generatedAt: savedManual.generatedAt,
          status: savedManual.status,
          pages: aiManual.metadata.pages
        },
        metadata: {
          aiTokensUsed: aiManual.metadata.aiTokensUsed,
          generationTime: aiManual.metadata.generated
        }
      });

    } catch (error) {
      logger.error('AI-Manual-Generierung fehlgeschlagen', {
        error: error.message,
        userId,
        orderId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Manual-Generierung fehlgeschlagen',
        message: error.message,
        code: 'MANUAL_GENERATION_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-manual/:manualId/pdf
 * Generiert PDF aus AI-kompiliertem Manual
 */
router.post('/:manualId/pdf',
  requireAuth,
  validateRequest(generatePDFSchema, { paramsSchema: { manualId: { type: 'string' } } }),
  async (req, res) => {
    const { manualId } = req.params;
    const { options = {} } = req.body;
    const userId = req.user.id;

    logger.info('PDF-Generierung angefragt', { userId, manualId, options });

    try {
      // Manual aus Datenbank laden
      const manual = await db.aiManual.findFirst({
        where: {
          id: manualId,
          userId: userId
        }
      });

      if (!manual) {
        return res.status(404).json({
          success: false,
          error: 'Manual nicht gefunden',
          code: 'MANUAL_NOT_FOUND'
        });
      }

      if (manual.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Manual ist noch nicht fertig generiert',
          code: 'MANUAL_NOT_READY'
        });
      }

      // PDF generieren
      const pdfResult = await pdfGenerator.generatePDF(manual.content, {
        format: options.format || 'A4',
        includeImages: options.includeImages !== false,
        includeTableOfContents: options.includeTableOfContents !== false,
        watermark: options.watermark || false,
        outputFilename: `manual-${manualId}.pdf`
      });

      // PDF-Status in Datenbank aktualisieren
      await db.aiManual.update({
        where: { id: manualId },
        data: {
          pdfGenerated: true,
          pdfPath: pdfResult.path,
          pdfSize: pdfResult.size,
          lastUpdated: new Date()
        }
      });

      logger.info('PDF erfolgreich generiert', {
        manualId,
        userId,
        filename: pdfResult.filename,
        size: pdfResult.size
      });

      res.status(200).json({
        success: true,
        pdf: {
          filename: pdfResult.filename,
          size: pdfResult.size,
          pages: pdfResult.pages,
          downloadUrl: `/api/ai-manual/${manualId}/download`
        },
        message: 'PDF erfolgreich generiert'
      });

    } catch (error) {
      logger.error('PDF-Generierung fehlgeschlagen', {
        error: error.message,
        userId,
        manualId,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'PDF-Generierung fehlgeschlagen',
        message: error.message,
        code: 'PDF_GENERATION_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-manual/:manualId
 * Holt AI-Manual Details
 */
router.get('/:manualId',
  requireAuth,
  async (req, res) => {
    const { manualId } = req.params;
    const userId = req.user.id;

    try {
      const manual = await db.aiManual.findFirst({
        where: {
          id: manualId,
          userId: userId
        }
      });

      if (!manual) {
        return res.status(404).json({
          success: false,
          error: 'Manual nicht gefunden',
          code: 'MANUAL_NOT_FOUND'
        });
      }

      res.status(200).json({
        success: true,
        manual: {
          id: manual.id,
          orderId: manual.orderId,
          title: manual.title,
          robotType: manual.robotType,
          difficulty: manual.difficulty,
          estimatedBuildTime: manual.estimatedBuildTime,
          language: manual.language,
          status: manual.status,
          generatedAt: manual.generatedAt,
          pdfGenerated: manual.pdfGenerated,
          content: req.query.includeContent === 'true' ? manual.content : undefined
        }
      });

    } catch (error) {
      logger.error('Fehler beim Laden des Manuals', {
        error: error.message,
        userId,
        manualId
      });

      res.status(500).json({
        success: false,
        error: 'Fehler beim Laden des Manuals',
        code: 'MANUAL_LOAD_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-manual/:manualId/download
 * PDF-Download
 */
router.get('/:manualId/download',
  requireAuth,
  async (req, res) => {
    const { manualId } = req.params;
    const userId = req.user.id;

    try {
      const manual = await db.aiManual.findFirst({
        where: {
          id: manualId,
          userId: userId
        }
      });

      if (!manual) {
        return res.status(404).json({
          success: false,
          error: 'Manual nicht gefunden'
        });
      }

      if (!manual.pdfGenerated || !manual.pdfPath) {
        return res.status(404).json({
          success: false,
          error: 'PDF wurde noch nicht generiert',
          code: 'PDF_NOT_GENERATED'
        });
      }

      // Prüfe ob PDF-Datei existiert
      const fs = require('fs').promises;
      try {
        await fs.access(manual.pdfPath);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'PDF-Datei nicht gefunden',
          code: 'PDF_FILE_MISSING'
        });
      }

      // Download-Header setzen
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=\"${manual.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf\"`);
      
      // PDF-Datei streamen
      const path = require('path');
      const filename = path.basename(manual.pdfPath);
      
      logger.info('PDF-Download', { userId, manualId, filename });
      
      res.sendFile(manual.pdfPath);

    } catch (error) {
      logger.error('PDF-Download fehlgeschlagen', {
        error: error.message,
        userId,
        manualId
      });

      res.status(500).json({
        success: false,
        error: 'Download fehlgeschlagen',
        code: 'DOWNLOAD_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-manual
 * Liste aller AI-Manuals des Users
 */
router.get('/',
  requireAuth,
  async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, robotType } = req.query;

    try {
      const where = { userId };
      
      if (status) where.status = status;
      if (robotType) where.robotType = robotType;

      const [manuals, total] = await Promise.all([
        db.aiManual.findMany({
          where,
          select: {
            id: true,
            orderId: true,
            title: true,
            robotType: true,
            difficulty: true,
            estimatedBuildTime: true,
            status: true,
            generatedAt: true,
            pdfGenerated: true,
            aiTokensUsed: true
          },
          orderBy: { generatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: parseInt(limit)
        }),
        db.aiManual.count({ where })
      ]);

      res.status(200).json({
        success: true,
        manuals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Fehler beim Laden der Manual-Liste', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: 'Fehler beim Laden der Manuals',
        code: 'MANUAL_LIST_FAILED'
      });
    }
  }
);

/**
 * DELETE /api/ai-manual/:manualId
 * Löscht AI-Manual (nur eigene)
 */
router.delete('/:manualId',
  requireAuth,
  async (req, res) => {
    const { manualId } = req.params;
    const userId = req.user.id;

    try {
      const manual = await db.aiManual.findFirst({
        where: {
          id: manualId,
          userId: userId
        }
      });

      if (!manual) {
        return res.status(404).json({
          success: false,
          error: 'Manual nicht gefunden'
        });
      }

      // PDF-Datei löschen (falls vorhanden)
      if (manual.pdfPath) {
        const fs = require('fs').promises;
        try {
          await fs.unlink(manual.pdfPath);
          logger.info('PDF-Datei gelöscht', { path: manual.pdfPath });
        } catch (error) {
          logger.warn('PDF-Datei konnte nicht gelöscht werden', { 
            path: manual.pdfPath,
            error: error.message 
          });
        }
      }

      // Manual aus Datenbank löschen
      await db.aiManual.delete({
        where: { id: manualId }
      });

      logger.info('AI-Manual gelöscht', { userId, manualId });

      res.status(200).json({
        success: true,
        message: 'Manual erfolgreich gelöscht'
      });

    } catch (error) {
      logger.error('Fehler beim Löschen des Manuals', {
        error: error.message,
        userId,
        manualId
      });

      res.status(500).json({
        success: false,
        error: 'Fehler beim Löschen',
        code: 'MANUAL_DELETE_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-manual/health
 * Health Check für AI-Manual-System
 */
router.get('/health',
  async (req, res) => {
    try {
      const [compilerHealth, pdfHealth] = await Promise.all([
        aiManualCompiler.healthCheck(),
        pdfGenerator.healthCheck()
      ]);

      const systemHealth = {
        status: compilerHealth.status === 'healthy' && pdfHealth.status === 'healthy' ? 'healthy' : 'degraded',
        components: {
          aiManualCompiler: compilerHealth,
          pdfGenerator: pdfHealth
        },
        timestamp: new Date().toISOString()
      };

      const statusCode = systemHealth.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(systemHealth);

    } catch (error) {
      logger.error('Health Check fehlgeschlagen', { error: error.message });
      
      res.status(500).json({
        status: 'down',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;