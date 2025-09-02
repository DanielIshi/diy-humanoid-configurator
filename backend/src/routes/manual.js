import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../lib/logger.js';
import { manualService } from '../services/manualService.js';

const router = express.Router();

/**
 * GET /api/manual/generate
 * Generiert Bauanleitung für gegebene Konfiguration
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { configuration } = req.body;
  
  if (!configuration) {
    return res.status(400).json({
      success: false,
      error: 'Konfiguration ist erforderlich'
    });
  }

  logger.info('Manual generation requested', { 
    configurationId: configuration.id,
    components: Object.keys(configuration.components || {}).length 
  });

  const manual = await manualService.generateManual(configuration);
  
  res.json({
    success: true,
    data: manual
  });
}));

/**
 * GET /api/manual/tools
 * Liefert verfügbare Werkzeuge und deren Details
 */
router.get('/tools', asyncHandler(async (req, res) => {
  const tools = Array.from(manualService.toolDatabase.values());
  
  res.json({
    success: true,
    data: {
      tools: tools,
      categories: [...new Set(tools.map(t => t.category))]
    }
  });
}));

/**
 * GET /api/manual/components
 * Liefert verfügbare Komponenten-Anleitungen
 */
router.get('/components', asyncHandler(async (req, res) => {
  const components = Array.from(manualService.componentManuals.entries()).map(([id, manual]) => ({
    id,
    name: manual.name || id,
    difficulty: manual.difficulty,
    estimatedTime: manual.estimatedTime,
    requiredTools: manual.requiredTools,
    steps: manual.steps?.length || 0
  }));

  res.json({
    success: true,
    data: components
  });
}));

/**
 * GET /api/manual/component/:id
 * Liefert detaillierte Anleitung für spezifische Komponente
 */
router.get('/component/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const manual = manualService.componentManuals.get(id);
  
  if (!manual) {
    return res.status(404).json({
      success: false,
      error: 'Komponenten-Anleitung nicht gefunden'
    });
  }

  res.json({
    success: true,
    data: manual
  });
}));

/**
 * GET /api/manual/dependencies/:componentId
 * Liefert Abhängigkeiten für eine Komponente
 */
router.get('/dependencies/:componentId', asyncHandler(async (req, res) => {
  const { componentId } = req.params;
  const dependencies = manualService.dependencies.get(componentId) || [];
  
  res.json({
    success: true,
    data: {
      componentId,
      dependencies,
      hasDependencies: dependencies.length > 0
    }
  });
}));

/**
 * POST /api/manual/validate
 * Validiert Konfiguration auf Vollständigkeit und Abhängigkeiten
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { configuration } = req.body;
  
  if (!configuration || !configuration.components) {
    return res.status(400).json({
      success: false,
      error: 'Ungültige Konfiguration'
    });
  }

  const selectedComponents = Object.entries(configuration.components)
    .filter(([_, component]) => component && component.selected)
    .map(([type, component]) => ({
      id: component.id || type,
      type,
      name: component.name || type
    }));

  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    missingDependencies: [],
    estimatedTime: 0
  };

  // Prüfe Abhängigkeiten
  selectedComponents.forEach(component => {
    const deps = manualService.dependencies.get(component.id) || [];
    const missingDeps = deps.filter(depId => 
      !selectedComponents.find(c => c.id === depId)
    );
    
    if (missingDeps.length > 0) {
      validation.isValid = false;
      validation.missingDependencies.push({
        component: component.name,
        missing: missingDeps
      });
      validation.errors.push(
        `${component.name} benötigt: ${missingDeps.join(', ')}`
      );
    }
  });

  // Schätze Zeit
  try {
    const orderedSteps = manualService.orderSteps(selectedComponents);
    const mergedInstructions = manualService.mergeInstructions(orderedSteps);
    const timeEstimate = manualService.estimateBuildTime(mergedInstructions);
    validation.estimatedTime = timeEstimate;
  } catch (error) {
    validation.warnings.push(`Zeitschätzung fehlgeschlagen: ${error.message}`);
  }

  // Warnungen für komplexe Konfigurationen
  if (selectedComponents.length > 10) {
    validation.warnings.push('Sehr komplexe Konfiguration - erwägen Sie Aufteilung in Phasen');
  }

  res.json({
    success: true,
    data: validation
  });
}));

/**
 * GET /api/manual/export/:manualId
 * Exportiert Anleitung in verschiedenen Formaten
 */
router.get('/export/:manualId', asyncHandler(async (req, res) => {
  const { manualId } = req.params;
  const { format = 'json' } = req.query;

  // In echter Implementierung würde hier die Anleitung aus Datenbank geladen
  // Für Demo-Zwecke generieren wir eine einfache Konfiguration
  const demoConfig = {
    id: manualId,
    components: {
      frame: { id: 'frame_aluminum', name: 'Aluminium Rahmen', selected: true },
      motor: { id: 'servo_motor_sg90', name: 'Servo Motor SG90', selected: true }
    }
  };

  const manual = await manualService.generateManual(demoConfig);

  switch (format.toLowerCase()) {
    case 'json':
      res.json({
        success: true,
        data: manual
      });
      break;
      
    case 'text':
      const textManual = formatAsText(manual);
      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="anleitung_${manualId}.txt"`
      });
      res.send(textManual);
      break;
      
    default:
      res.status(400).json({
        success: false,
        error: 'Unterstützte Formate: json, text'
      });
  }
}));

/**
 * Formatiert Manual als Text-Dokument
 * @private
 */
function formatAsText(manual) {
  let text = `DIY HUMANOID BAUANLEITUNG\n`;
  text += `${'='.repeat(50)}\n\n`;
  
  text += `Generiert: ${manual.metadata.generated}\n`;
  text += `Geschätzte Zeit: ${manual.metadata.estimatedTime.formatted.display}\n`;
  text += `Schwierigkeit: ${manual.metadata.difficulty}\n`;
  text += `Schritte gesamt: ${manual.metadata.totalSteps}\n\n`;

  text += `BENÖTIGTE WERKZEUGE:\n`;
  text += `${'-'.repeat(20)}\n`;
  manual.overview.requiredTools.forEach(tool => {
    text += `• ${tool.name} (${tool.category})\n`;
  });
  text += '\n';

  text += `SICHERHEITSHINWEISE:\n`;
  text += `${'-'.repeat(20)}\n`;
  manual.overview.safetyNotes.forEach(note => {
    text += `⚠ ${note}\n`;
  });
  text += '\n';

  text += `BAUANLEITUNG:\n`;
  text += `${'-'.repeat(20)}\n`;
  manual.instructions.forEach((step, index) => {
    text += `\n${index + 1}. ${step.title.toUpperCase()}\n`;
    text += `Zeit: ${step.estimatedTime}min | Schwierigkeit: ${step.difficulty}\n`;
    text += `${step.description}\n`;
    
    if (step.steps && step.steps.length > 0) {
      text += `Schritte:\n`;
      step.steps.forEach(substep => {
        text += `  • ${substep}\n`;
      });
    }
    
    if (step.warnings && step.warnings.length > 0) {
      text += `Warnungen:\n`;
      step.warnings.forEach(warning => {
        text += `  ⚠ ${warning}\n`;
      });
    }
    text += '\n';
  });

  return text;
}

export default router;