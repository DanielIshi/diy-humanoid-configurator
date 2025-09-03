// AI Manual Compiler Service für vorkompilierte DIY Bauanleitungen
// Kompiliert aus Einzelkomponenten-Handbüchern komplette, personalisierte Bauanleitungen

const { logger } = require('../lib/logger');
const aiService = require('./aiService');
const { redis } = require('./cacheService');
const fs = require('fs').promises;
const path = require('path');

class AIManualCompilerService {
  constructor() {
    this.componentManualsPath = path.join(__dirname, '../data/component-manuals');
    this.templatesPath = path.join(__dirname, '../templates/manual');
    this.cache = {
      ttl: 7200, // 2 Stunden Cache für Manual-Generation
      componentManuals: new Map(),
      templates: new Map()
    };
    
    // AI Prompts für Manual-Compilation
    this.prompts = {
      manualCompiler: `Du bist ein Experte für DIY-Robotik und erstellst professionelle Bauanleitungen.

AUFGABE: Kompiliere aus den gegebenen Einzelkomponenten-Handbüchern eine zusammenhängende, 
logische Gesamtbauanleitung für einen DIY-Humanoid-Roboter.

ANFORDERUNGEN:
- Schritt-für-Schritt Anleitung in deutscher Sprache
- Logische Abhängigkeitsreihenfolge (z.B. Rahmen vor Motoren)  
- Sicherheitshinweise bei kritischen Schritten
- Werkzeugliste und Materialliste
- Zeitschätzungen für jeden Hauptschritt
- Troubleshooting-Tipps für häufige Probleme

STRUKTUR:
1. Übersicht und Vorbereitung
2. Materialliste und Werkzeuge
3. Sicherheitshinweise
4. Schritt-für-Schritt Montage
5. Tests und Kalibrierung
6. Troubleshooting
7. Wartung und Pflege

STIL:
- Klare, verständliche Sprache
- Präzise technische Anweisungen
- Du-Ansprache
- Warnung vor kritischen Fehlern
- Ermutigendes, hilfsbereites Tone

QUELLEN: Verweise immer auf die Original-Handbücher der Hersteller`,

      contentSynthesizer: `Du bist ein AI-Assistent für das Zusammenführen technischer Dokumentationen.

Kombiniere die gegebenen Handbuch-Abschnitte zu einem kohärenten Gesamtdokument:
- Eliminiere Redundanzen
- Stelle logische Verbindungen her
- Harmonisiere Terminologie
- Behalte wichtige Sicherheitshinweise bei
- Füge Übergänge zwischen Abschnitten ein`,

      safetyAnalyzer: `Analysiere die Bauanleitung auf Sicherheitsrisiken und ergänze Warnungen:

KRITISCHE BEREICHE:
- Elektrische Arbeiten (Kurzschluss, Stromschlag)
- Mechanische Belastungen (Quetschungen, scharfe Kanten)  
- Werkzeuggebrauch (Verletzungsrisiken)
- Chemische Stoffe (Lötmittel, Klebstoffe)

Füge angemessene Warnhinweise und Schutzmaßnahmen hinzu.`
    };
  }

  /**
   * Hauptfunktion: Generiert AI-kompilierte Bauanleitung
   */
  async generateAICompiledManual(orderConfiguration) {
    logger.info('Starte AI-Manual-Kompilierung', { 
      orderId: orderConfiguration.orderId,
      components: Object.keys(orderConfiguration.components || {}).length 
    });

    try {
      // 1. Komponenten-Handbücher laden
      const componentManuals = await this.loadComponentManuals(orderConfiguration.components);
      
      // 2. Roboter-Typ und Template bestimmen
      const robotType = this.determineRobotType(orderConfiguration);
      const baseTemplate = await this.loadManualTemplate(robotType);
      
      // 3. AI-gestützte Inhalt-Synthese
      const synthesizedContent = await this.synthesizeManualContent(
        componentManuals, 
        orderConfiguration,
        robotType
      );
      
      // 4. Sicherheitsanalyse und -ergänzung
      const safetyEnhanced = await this.enhanceWithSafetyAnalysis(synthesizedContent);
      
      // 5. Finale Manual-Assemblierung mit Branding
      const compiledManual = await this.assembleCompleteManual(
        safetyEnhanced,
        baseTemplate,
        orderConfiguration
      );
      
      // 6. Quellenreferenzen hinzufügen
      const finalManual = this.addSourceReferences(compiledManual, componentManuals);
      
      // 7. Legal Disclaimers integrieren
      const manualWithDisclaimers = this.addLegalDisclaimers(finalManual);
      
      logger.info('AI-Manual-Kompilierung erfolgreich', {
        orderId: orderConfiguration.orderId,
        pages: manualWithDisclaimers.metadata.estimatedPages,
        tokens: manualWithDisclaimers.metadata.aiTokensUsed
      });
      
      return manualWithDisclaimers;
      
    } catch (error) {
      logger.error('AI-Manual-Kompilierung fehlgeschlagen', {
        error: error.message,
        orderId: orderConfiguration.orderId
      });
      throw new Error(`AI Manual Compilation failed: ${error.message}`);
    }
  }

  /**
   * Lädt alle relevanten Komponenten-Handbücher
   */
  async loadComponentManuals(components) {
    logger.debug('Lade Komponenten-Handbücher', { components: Object.keys(components).length });
    
    const manuals = {};
    
    for (const [componentType, component] of Object.entries(components)) {
      if (component && component.selected) {
        const manualPath = path.join(
          this.componentManualsPath, 
          `${component.id || componentType}.json`
        );
        
        try {
          // Cache prüfen
          const cacheKey = `manual:${component.id || componentType}`;
          let manual = this.cache.componentManuals.get(cacheKey);
          
          if (!manual) {
            // Manual aus Datei laden
            const manualData = await fs.readFile(manualPath, 'utf8');
            manual = JSON.parse(manualData);
            this.cache.componentManuals.set(cacheKey, manual);
          }
          
          manuals[componentType] = manual;
          
        } catch (error) {
          // Fallback: Generisches Manual erstellen
          logger.warn(`Kein Manual für ${componentType} gefunden, verwende Fallback`, {
            component: component.id,
            error: error.message
          });
          
          manuals[componentType] = this.createFallbackManual(componentType, component);
        }
      }
    }
    
    return manuals;
  }

  /**
   * Bestimmt Roboter-Typ basierend auf Konfiguration
   */
  determineRobotType(configuration) {
    const components = configuration.components || {};
    
    // Heuristische Typ-Erkennung
    if (components.humanoid_frame || configuration.type === 'humanoid') {
      return 'humanoid';
    }
    if (components.quadruped_frame || configuration.type === 'quadruped') {
      return 'quadruped';
    }
    if (components.arm_base || configuration.type === 'robotic_arm') {
      return 'robotic_arm';
    }
    
    // Default
    return 'general_purpose';
  }

  /**
   * AI-gestützte Inhalt-Synthese
   */
  async synthesizeManualContent(componentManuals, configuration, robotType) {
    logger.debug('Starte AI-Inhalt-Synthese', { 
      robotType,
      manualCount: Object.keys(componentManuals).length 
    });
    
    // Komponenten-Inhalte für AI vorbereiten
    const manualSummaries = Object.entries(componentManuals).map(([type, manual]) => ({
      component: type,
      name: manual.name || type,
      difficulty: manual.difficulty || 'medium',
      steps: manual.steps || [],
      tools: manual.requiredTools || [],
      safety: manual.safetyNotes || [],
      dependencies: manual.dependencies || []
    }));
    
    const contextPrompt = `KONFIGURATION: ${JSON.stringify({
      robotType,
      totalComponents: manualSummaries.length,
      userSkill: configuration.userSkillLevel || 'beginner',
      estimatedBudget: configuration.totalPrice || 'unbekannt'
    }, null, 2)}

KOMPONENTEN-HANDBÜCHER:
${JSON.stringify(manualSummaries, null, 2)}`;

    const messages = [
      { role: 'system', content: this.prompts.manualCompiler },
      { role: 'user', content: contextPrompt },
      { 
        role: 'user', 
        content: `Erstelle eine vollständige Bauanleitung für diesen ${robotType}-Roboter. 
        Berücksichtige die Abhängigkeiten zwischen den Komponenten und erstelle eine 
        logische Schritt-für-Schritt Anleitung.` 
      }
    ];
    
    const response = await aiService.chatCompletion(messages, {
      userId: `system:manual-compiler`,
      useCache: true
    });
    
    return {
      content: response.content,
      metadata: {
        provider: response.provider,
        tokens: response.tokens,
        model: response.model,
        generatedAt: response.timestamp
      }
    };
  }

  /**
   * Sicherheitsanalyse und -verbesserung
   */
  async enhanceWithSafetyAnalysis(synthesizedContent) {
    logger.debug('Führe Sicherheitsanalyse durch');
    
    const messages = [
      { role: 'system', content: this.prompts.safetyAnalyzer },
      { role: 'user', content: synthesizedContent.content }
    ];
    
    const response = await aiService.chatCompletion(messages, {
      userId: 'system:safety-analyzer',
      useCache: true
    });
    
    return {
      ...synthesizedContent,
      content: response.content,
      metadata: {
        ...synthesizedContent.metadata,
        safetyAnalysis: {
          provider: response.provider,
          tokens: response.tokens,
          analyzedAt: response.timestamp
        }
      }
    };
  }

  /**
   * Finale Manual-Assemblierung mit Corporate Branding
   */
  async assembleCompleteManual(enhancedContent, template, configuration) {
    const now = new Date();
    
    return {
      id: `ai-manual-${configuration.orderId}-${Date.now()}`,
      type: 'ai_compiled_manual',
      metadata: {
        title: `DIY ${this.determineRobotType(configuration)} Bauanleitung`,
        subtitle: 'Personalisierte AI-kompilierte Anleitung',
        version: '1.0.0',
        generated: now.toISOString(),
        orderId: configuration.orderId,
        robotType: this.determineRobotType(configuration),
        language: 'de-DE',
        pages: this.estimatePages(enhancedContent.content),
        estimatedBuildTime: this.estimateBuildTime(configuration.components),
        difficulty: this.calculateDifficulty(configuration.components),
        aiTokensUsed: enhancedContent.metadata.tokens + (enhancedContent.metadata.safetyAnalysis?.tokens || 0),
        branding: {
          company: 'DIY Humanoid Configurator',
          logo: '/assets/logo.png',
          colors: {
            primary: '#2563eb',
            secondary: '#1e40af',
            accent: '#3b82f6'
          }
        }
      },
      content: {
        coverPage: this.generateCoverPage(configuration),
        tableOfContents: this.generateTableOfContents(enhancedContent.content),
        overview: this.generateOverview(configuration),
        safetyNotice: this.generateSafetyNotice(),
        toolsAndMaterials: this.extractToolsAndMaterials(enhancedContent.content),
        instructions: enhancedContent.content,
        troubleshooting: this.generateTroubleshootingSection(configuration),
        maintenance: this.generateMaintenanceSection(configuration),
        warranty: this.generateWarrantySection()
      },
      sources: [], // Wird später hinzugefügt
      legal: {} // Wird später hinzugefügt
    };
  }

  /**
   * Quellenreferenzen hinzufügen
   */
  addSourceReferences(manual, componentManuals) {
    const sources = [];
    
    Object.entries(componentManuals).forEach(([type, manual]) => {
      if (manual.source || manual.manufacturer) {
        sources.push({
          component: type,
          name: manual.name || type,
          manufacturer: manual.manufacturer || 'Unbekannt',
          originalManual: manual.source || null,
          version: manual.version || '1.0',
          url: manual.url || null,
          retrieved: new Date().toISOString()
        });
      }
    });
    
    return {
      ...manual,
      sources,
      content: {
        ...manual.content,
        sources: this.formatSourcesSection(sources)
      }
    };
  }

  /**
   * Legal Disclaimers hinzufügen
   */
  addLegalDisclaimers(manual) {
    const legal = {
      disclaimer: `WICHTIGER RECHTLICHER HINWEIS:
      
Diese Bauanleitung wurde mittels künstlicher Intelligenz aus verschiedenen Quellen 
zusammengestellt und dient ausschließlich als Hilfestellung und Ratgeber für 
DIY-Projekte.

KEINE GEWÄHRLEISTUNG:
- Wir übernehmen keinerlei Gewährleistung für die Vollständigkeit, Richtigkeit 
  oder Aktualität der Informationen
- Die Nutzung erfolgt auf eigene Gefahr und Verantwortung
- Schäden jeder Art sind ausgeschlossen

SICHERHEIT:
- Beachten Sie immer die Original-Handbücher der Komponentenhersteller
- Bei Unsicherheiten konsultieren Sie Fachpersonal
- Arbeiten Sie niemals unter Spannung

URHEBERRECHT:
- Diese Anleitung basiert auf öffentlich verfügbaren Informationen
- Alle Marken und Produktnamen sind Eigentum ihrer jeweiligen Inhaber
- Die kommerzielle Nutzung ist untersagt`,

      liability: `Der Anbieter haftet nicht für Schäden, die durch die Nutzung 
dieser AI-generierten Anleitung entstehen.`,

      dataProtection: `Diese Anleitung wurde personalisiert erstellt. Ihre 
Konfigurationsdaten werden gemäß unserer Datenschutzerklärung verarbeitet.`
    };

    return {
      ...manual,
      legal,
      content: {
        ...manual.content,
        legalNotice: this.formatLegalSection(legal)
      }
    };
  }

  /**
   * Hilfsfunktionen
   */
  
  createFallbackManual(componentType, component) {
    return {
      name: component.name || componentType,
      type: componentType,
      difficulty: 'medium',
      estimatedTime: 30,
      requiredTools: ['screwdriver_phillips', 'wire_strippers'],
      safetyNotes: ['Sicherheitshinweise des Herstellers beachten'],
      steps: [{
        title: `${component.name || componentType} Installation`,
        description: 'Folgen Sie der Herstelleranleitung für die Installation.',
        estimatedTime: 30,
        difficulty: 'medium'
      }],
      source: 'Fallback - Konsultieren Sie das Original-Handbuch'
    };
  }

  estimatePages(content) {
    // Grobe Schätzung: ~500 Zeichen pro Seite
    return Math.ceil(content.length / 500);
  }

  estimateBuildTime(components) {
    const baseTime = 120; // 2 Stunden Basis
    const componentTime = Object.keys(components).length * 30; // 30min pro Komponente
    return {
      total: baseTime + componentTime,
      formatted: `${Math.floor((baseTime + componentTime) / 60)}h ${(baseTime + componentTime) % 60}min`,
      sessions: Math.ceil((baseTime + componentTime) / 180) // 3h Sessions
    };
  }

  calculateDifficulty(components) {
    const componentCount = Object.keys(components).length;
    if (componentCount <= 3) return 'beginner';
    if (componentCount <= 6) return 'intermediate';
    return 'advanced';
  }

  generateCoverPage(configuration) {
    return {
      title: `DIY ${this.determineRobotType(configuration)} Roboter`,
      subtitle: 'Personalisierte Bauanleitung',
      orderId: configuration.orderId,
      generatedFor: configuration.customerName || 'Kunde',
      generatedOn: new Date().toLocaleDateString('de-DE'),
      difficulty: this.calculateDifficulty(configuration.components),
      estimatedTime: this.estimateBuildTime(configuration.components).formatted
    };
  }

  generateSafetyNotice() {
    return `SICHERHEITSHINWEISE - BITTE BEACHTEN:

⚠️  WICHTIGE WARNUNGEN:
- Arbeiten Sie niemals an elektrischen Komponenten unter Spannung
- Tragen Sie geeignete Schutzausrüstung (Brille, Handschuhe)
- Halten Sie den Arbeitsplatz sauber und aufgeräumt
- Lesen Sie alle Herstellerangaben vor Beginn der Arbeit

🔧 WERKZEUGE:
- Verwenden Sie nur geeignete und unbeschädigte Werkzeuge
- Prüfen Sie elektrische Messgeräte vor Gebrauch

⚡ ELEKTRIK:
- Überprüfen Sie alle Verbindungen vor der Inbetriebnahme
- Verwenden Sie nur die angegebenen Spannungen und Ströme
- Bei Unsicherheit: Fachmann konsultieren`;
  }

  generateTroubleshootingSection(configuration) {
    return `FEHLERBEHEBUNG - HÄUFIGE PROBLEME:

🔧 MECHANISCHE PROBLEME:
- Problem: Teile passen nicht zusammen
  → Lösung: Überprüfen Sie die Ausrichtung und eventuelle Verformungen
  
- Problem: Gelenke bewegen sich schwergängig
  → Lösung: Schmierung prüfen, Kalibrierung überprüfen

⚡ ELEKTRISCHE PROBLEME:
- Problem: Motor reagiert nicht
  → Lösung: Stromversorgung und Verkabelung prüfen
  
- Problem: Sensoren liefern falsche Werte
  → Lösung: Kalibrierung durchführen, Kontakte reinigen

💻 SOFTWARE-PROBLEME:
- Problem: Upload zur Steuerung schlägt fehl
  → Lösung: USB-Verbindung prüfen, richtige Treiber installieren

📞 HILFE ANFORDERN:
Bei anhaltenden Problemen wenden Sie sich an die Original-Hersteller 
der Komponenten oder konsultieren Sie Fachforen.`;
  }

  formatSourcesSection(sources) {
    if (sources.length === 0) return 'Keine spezifischen Quellen verfügbar.';
    
    return `QUELLEN UND REFERENZEN:

Diese Anleitung basiert auf folgenden Original-Dokumentationen:

${sources.map((source, index) => `
${index + 1}. ${source.name}
   Hersteller: ${source.manufacturer}
   ${source.originalManual ? `Original-Manual: ${source.originalManual}` : ''}
   ${source.url ? `URL: ${source.url}` : ''}
   Version: ${source.version}
`).join('\n')}

Alle Informationen wurden am ${new Date().toLocaleDateString('de-DE')} abgerufen.

HINWEIS: Konsultieren Sie bei Problemen immer die aktuellen Original-Handbücher 
der jeweiligen Hersteller.`;
  }

  formatLegalSection(legal) {
    return `RECHTLICHE HINWEISE:

${legal.disclaimer}

HAFTUNGSAUSSCHLUSS:
${legal.liability}

DATENSCHUTZ:
${legal.dataProtection}

Diese Hinweise sind integraler Bestandteil dieser Anleitung.`;
  }

  /**
   * Cache Management
   */
  async clearCache() {
    this.cache.componentManuals.clear();
    this.cache.templates.clear();
    logger.info('AI Manual Compiler Cache geleert');
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      // Prüfe Verzeichnisse
      const componentManualsExists = await fs.access(this.componentManualsPath).then(() => true).catch(() => false);
      const templatesExists = await fs.access(this.templatesPath).then(() => true).catch(() => false);
      
      // Prüfe AI Service
      const aiHealthy = await aiService.healthCheck();
      
      return {
        status: componentManualsExists && templatesExists && aiHealthy.status !== 'down' ? 'healthy' : 'degraded',
        components: {
          componentManuals: componentManualsExists,
          templates: templatesExists,
          aiService: aiHealthy.status !== 'down',
          cache: this.cache.componentManuals.size > 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('AI Manual Compiler Health Check failed', { error: error.message });
      return {
        status: 'down',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new AIManualCompilerService();