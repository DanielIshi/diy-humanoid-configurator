// PDF Generator Service für AI-kompilierte DIY Bauanleitungen
// Erstellt hochwertige, branded PDFs aus AI-generierten Manual-Inhalten

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../lib/logger');
const { redis } = require('./cacheService');

class PDFGeneratorService {
  constructor() {
    this.fontsPath = path.join(__dirname, '../assets/fonts');
    this.imagesPath = path.join(__dirname, '../assets/images');
    this.outputPath = path.join(__dirname, '../../generated/manuals');
    
    // Corporate Design
    this.branding = {
      colors: {
        primary: '#2563eb',     // Blue-600
        secondary: '#1e40af',   // Blue-700  
        accent: '#3b82f6',      // Blue-500
        text: '#1f2937',        // Gray-800
        textLight: '#6b7280',   // Gray-500
        warning: '#dc2626',     // Red-600
        success: '#059669',     // Emerald-600
        background: '#f9fafb'   // Gray-50
      },
      fonts: {
        title: 'Helvetica-Bold',
        heading: 'Helvetica-Bold', 
        body: 'Helvetica',
        code: 'Courier'
      },
      spacing: {
        margin: 50,
        lineHeight: 1.4,
        sectionGap: 20,
        stepGap: 15
      }
    };
    
    // Seitenformate
    this.pageFormats = {
      A4: [595.28, 841.89],
      Letter: [612, 792],
      A3: [841.89, 1190.55]
    };
    
    this.currentFormat = 'A4';
  }

  /**
   * Hauptfunktion: Generiert PDF aus AI-kompiliertem Manual
   */
  async generatePDF(aiManual, options = {}) {
    const {
      format = 'A4',
      includeImages = true,
      includeTableOfContents = true,
      watermark = false,
      outputFilename = null
    } = options;

    logger.info('Starte PDF-Generierung', {
      manualId: aiManual.id,
      format,
      pages: aiManual.metadata.pages
    });

    try {
      // Output-Verzeichnis sicherstellen
      await this.ensureOutputDirectory();
      
      // PDF-Dokument erstellen
      const doc = new PDFDocument({
        size: format,
        margins: {
          top: this.branding.spacing.margin,
          bottom: this.branding.spacing.margin,
          left: this.branding.spacing.margin,
          right: this.branding.spacing.margin
        },
        info: {
          Title: aiManual.metadata.title,
          Author: 'DIY Humanoid Configurator',
          Subject: `Bauanleitung für ${aiManual.metadata.robotType}`,
          Keywords: 'DIY, Robotik, Bauanleitung, AI-generiert',
          Creator: 'AI Manual Compiler',
          Producer: 'DIY Humanoid Configurator PDF Generator'
        }
      });

      // PDF-Stream vorbereiten
      const filename = outputFilename || `manual-${aiManual.id}.pdf`;
      const outputPath = path.join(this.outputPath, filename);
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // PDF-Inhalt generieren
      await this.generateCoverPage(doc, aiManual);
      
      if (includeTableOfContents) {
        await this.generateTableOfContents(doc, aiManual);
      }
      
      await this.generateOverview(doc, aiManual);
      await this.generateSafetySection(doc, aiManual);
      await this.generateToolsAndMaterials(doc, aiManual);
      await this.generateInstructions(doc, aiManual, includeImages);
      await this.generateTroubleshooting(doc, aiManual);
      await this.generateSources(doc, aiManual);
      await this.generateLegalNotice(doc, aiManual);

      // Wasserzeichen hinzufügen (wenn aktiviert)
      if (watermark) {
        await this.addWatermark(doc, 'AI-GENERIERT');
      }

      // PDF finalisieren
      doc.end();

      // Auf Completion warten
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const stats = await fs.stat(outputPath);
      
      logger.info('PDF erfolgreich generiert', {
        manualId: aiManual.id,
        filename,
        size: `${Math.round(stats.size / 1024)} KB`,
        path: outputPath
      });

      return {
        success: true,
        filename,
        path: outputPath,
        size: stats.size,
        pages: doc.bufferedPageRange().count || 'unknown'
      };

    } catch (error) {
      logger.error('PDF-Generierung fehlgeschlagen', {
        error: error.message,
        manualId: aiManual.id
      });
      throw new Error(`PDF Generation failed: ${error.message}`);
    }
  }

  /**
   * Deckblatt generieren
   */
  async generateCoverPage(doc, manual) {
    const { colors, fonts, spacing } = this.branding;
    
    // Header mit Logo-Bereich
    doc.rect(0, 0, doc.page.width, 120)
       .fill(colors.primary);
    
    // Titel
    doc.fillColor('#ffffff')
       .font(fonts.title)
       .fontSize(28)
       .text(manual.metadata.title, spacing.margin, 40, {
         width: doc.page.width - (spacing.margin * 2),
         align: 'center'
       });
    
    // Untertitel
    doc.fontSize(16)
       .text(manual.metadata.subtitle || 'AI-kompilierte Bauanleitung', spacing.margin, 80, {
         width: doc.page.width - (spacing.margin * 2),
         align: 'center'
       });

    // Hauptinfo-Bereich
    const startY = 180;
    doc.fillColor(colors.text)
       .font(fonts.heading)
       .fontSize(14);

    // Roboter-Typ
    doc.text('Roboter-Typ:', spacing.margin, startY);
    doc.font(fonts.body)
       .text(manual.metadata.robotType.toUpperCase(), spacing.margin + 120, startY);

    // Schwierigkeitsgrad
    const difficultyY = startY + 30;
    doc.font(fonts.heading)
       .text('Schwierigkeitsgrad:', spacing.margin, difficultyY);
    
    const difficultyColors = {
      beginner: colors.success,
      intermediate: '#f59e0b',
      advanced: colors.warning
    };
    
    doc.fillColor(difficultyColors[manual.metadata.difficulty] || colors.text)
       .font(fonts.body)
       .text(manual.metadata.difficulty.toUpperCase(), spacing.margin + 120, difficultyY);

    // Bauzeit
    const timeY = difficultyY + 30;
    doc.fillColor(colors.text)
       .font(fonts.heading)
       .text('Geschätzte Bauzeit:', spacing.margin, timeY);
    doc.font(fonts.body)
       .text(manual.metadata.estimatedBuildTime?.formatted || 'Variabel', spacing.margin + 120, timeY);

    // Generierungsdatum
    const dateY = timeY + 30;
    doc.font(fonts.heading)
       .text('Generiert am:', spacing.margin, dateY);
    doc.font(fonts.body)
       .text(new Date(manual.metadata.generated).toLocaleDateString('de-DE'), spacing.margin + 120, dateY);

    // Bestell-ID (falls vorhanden)
    if (manual.metadata.orderId) {
      const orderY = dateY + 30;
      doc.font(fonts.heading)
         .text('Bestellung:', spacing.margin, orderY);
      doc.font(fonts.body)
         .text(`#${manual.metadata.orderId}`, spacing.margin + 120, orderY);
    }

    // Warnung/Disclaimer Box
    const warningY = doc.page.height - 200;
    doc.rect(spacing.margin, warningY, doc.page.width - (spacing.margin * 2), 100)
       .strokeColor(colors.warning)
       .stroke();
    
    doc.fillColor(colors.warning)
       .font(fonts.heading)
       .fontSize(12)
       .text('⚠️  WICHTIGER HINWEIS', spacing.margin + 10, warningY + 15);
    
    doc.fillColor(colors.text)
       .font(fonts.body)
       .fontSize(10)
       .text('Diese AI-generierte Anleitung dient nur als Hilfestellung. Konsultieren Sie ' +
             'immer die Original-Handbücher der Hersteller. Nutzung auf eigene Gefahr.',
             spacing.margin + 10, warningY + 35, {
               width: doc.page.width - (spacing.margin * 2) - 20,
               align: 'left'
             });

    // Footer
    doc.fillColor(colors.textLight)
       .fontSize(8)
       .text('Generiert von DIY Humanoid Configurator AI', 
             spacing.margin, doc.page.height - 30, {
               width: doc.page.width - (spacing.margin * 2),
               align: 'center'
             });
    
    doc.addPage();
  }

  /**
   * Inhaltsverzeichnis generieren
   */
  async generateTableOfContents(doc, manual) {
    const { colors, fonts, spacing } = this.branding;
    
    this.addSectionHeader(doc, 'INHALTSVERZEICHNIS');
    
    const contents = [
      { title: '1. Übersicht und Vorbereitung', page: 3 },
      { title: '2. Sicherheitshinweise', page: 4 },
      { title: '3. Werkzeuge und Materialien', page: 5 },
      { title: '4. Bauanleitung', page: 6 },
      { title: '5. Tests und Kalibrierung', page: '...' },
      { title: '6. Fehlerbehebung', page: '...' },
      { title: '7. Quellen und Referenzen', page: '...' },
      { title: '8. Rechtliche Hinweise', page: '...' }
    ];
    
    let currentY = doc.y + spacing.sectionGap;
    
    contents.forEach(item => {
      doc.fillColor(colors.text)
         .font(fonts.body)
         .fontSize(11)
         .text(item.title, spacing.margin, currentY);
      
      doc.text(item.page.toString(), doc.page.width - spacing.margin - 30, currentY, {
        width: 30,
        align: 'right'
      });
      
      // Punktlinie
      const dotsY = currentY + 6;
      doc.strokeColor(colors.textLight)
         .lineWidth(0.5)
         .moveTo(spacing.margin + doc.widthOfString(item.title) + 10, dotsY)
         .lineTo(doc.page.width - spacing.margin - 50, dotsY)
         .stroke();
      
      currentY += 20;
    });
    
    doc.addPage();
  }

  /**
   * Übersicht generieren
   */
  async generateOverview(doc, manual) {
    this.addSectionHeader(doc, 'ÜBERSICHT UND VORBEREITUNG');
    
    const content = `Willkommen zur personalisierten Bauanleitung für Ihren DIY ${manual.metadata.robotType} Roboter!

Diese Anleitung wurde mithilfe künstlicher Intelligenz speziell für Ihre Konfiguration erstellt und führt Sie Schritt für Schritt durch den Aufbau Ihres Roboters.

WICHTIGE VORBEREITUNG:
• Lesen Sie die komplette Anleitung vor Beginn durch
• Stellen Sie alle Werkzeuge und Materialien bereit
• Planen Sie ausreichend Zeit ein (ca. ${manual.metadata.estimatedBuildTime?.formatted || '4-6 Stunden'})
• Arbeiten Sie in ruhiger, gut beleuchteter Umgebung

AUFBAU DER ANLEITUNG:
Diese Anleitung ist in logische Abschnitte gegliedert, die aufeinander aufbauen. Überspringen Sie keine Schritte und führen Sie die Tests zwischen den Hauptabschnitten durch.`;

    this.addBodyText(doc, content);
    
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }
  }

  /**
   * Sicherheitshinweise generieren
   */
  async generateSafetySection(doc, manual) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
    
    this.addSectionHeader(doc, 'SICHERHEITSHINWEISE');
    
    // Sicherheitsbox
    const { colors } = this.branding;
    const boxY = doc.y;
    const boxHeight = 180;
    
    doc.rect(this.branding.spacing.margin, boxY, 
             doc.page.width - (this.branding.spacing.margin * 2), boxHeight)
       .strokeColor(colors.warning)
       .lineWidth(2)
       .stroke();
    
    doc.fillColor(colors.warning)
       .font(this.branding.fonts.heading)
       .fontSize(14)
       .text('⚠️  SICHERHEIT GEHT VOR!', this.branding.spacing.margin + 15, boxY + 15);
    
    const safetyContent = manual.content.safetyNotice || `WICHTIGE SICHERHEITSREGELN:

• Arbeiten Sie NIEMALS an elektrischen Komponenten unter Spannung
• Tragen Sie geeignete Schutzausrüstung (Brille, Handschuhe)
• Verwenden Sie nur isolierte Werkzeuge bei elektrischen Arbeiten
• Halten Sie den Arbeitsplatz sauber und aufgeräumt
• Bei Unsicherheiten: Fachmann konsultieren
• Lesen Sie alle Herstellerangaben vor Beginn

ERSTE HILFE:
Halten Sie ein Erste-Hilfe-Set bereit und informieren Sie sich über die Notfallnummer.`;
    
    doc.fillColor(colors.text)
       .font(this.branding.fonts.body)
       .fontSize(9)
       .text(safetyContent, this.branding.spacing.margin + 15, boxY + 40, {
         width: doc.page.width - (this.branding.spacing.margin * 2) - 30,
         lineGap: 3
       });
    
    doc.y = boxY + boxHeight + this.branding.spacing.sectionGap;
  }

  /**
   * Werkzeuge und Materialien
   */
  async generateToolsAndMaterials(doc, manual) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
    
    this.addSectionHeader(doc, 'WERKZEUGE UND MATERIALIEN');
    
    // Werkzeugliste (Beispiel - sollte aus Manual extrahiert werden)
    const tools = [
      '• Kreuzschlitzschraubendreher (PH1, PH2)',
      '• Inbusschlüssel-Set (2-8mm)',
      '• Abisolierzange',
      '• Multimeter',
      '• Lötkolben (optional)',
      '• Seitenschneider',
      '• Wasserwaage',
      '• Computer mit USB-Anschluss'
    ];
    
    this.addBodyText(doc, 'BENÖTIGTE WERKZEUGE:');
    this.addBodyText(doc, tools.join('\n'), { indented: true });
    
    // Zusätzliche Materialien
    const materials = [
      '• Kabelbinder',
      '• Isolierband',
      '• Schrauben (M3, M4 in verschiedenen Längen)',
      '• Wärmeleitpaste',
      '• Kontaktspray (optional)'
    ];
    
    this.addBodyText(doc, '\nZUSÄTZLICHE MATERIALIEN:');
    this.addBodyText(doc, materials.join('\n'), { indented: true });
    
    // Hinweis
    this.addBodyText(doc, '\n💡 HINWEIS: Die meisten Werkzeuge und Verbrauchsmaterialien sind in jedem gut sortierten Haushalt vorhanden.', { 
      style: 'italic',
      color: this.branding.colors.textLight
    });
  }

  /**
   * Hauptbauanleitungen
   */
  async generateInstructions(doc, manual, includeImages = true) {
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    
    this.addSectionHeader(doc, 'SCHRITT-FÜR-SCHRITT BAUANLEITUNG');
    
    // AI-generierten Content formatieren
    const instructions = manual.content.instructions;
    
    // Content in Abschnitte aufteilen (einfache Heuristik)
    const sections = this.parseInstructionSections(instructions);
    
    sections.forEach((section, index) => {
      // Neue Seite für jeden Hauptabschnitt
      if (index > 0 && doc.y > doc.page.height - 200) {
        doc.addPage();
      }
      
      // Abschnittstitel
      this.addSubsectionHeader(doc, `${index + 1}. ${section.title}`);
      
      // Inhalt
      this.addBodyText(doc, section.content);
      
      // Schritte (falls vorhanden)
      if (section.steps && section.steps.length > 0) {
        section.steps.forEach((step, stepIndex) => {
          this.addStepBox(doc, stepIndex + 1, step);
        });
      }
      
      // Seitenwechsel zwischen größeren Abschnitten
      if (index < sections.length - 1) {
        this.addSpacing(doc, this.branding.spacing.sectionGap);
      }
    });
  }

  /**
   * Fehlerbehebung
   */
  async generateTroubleshooting(doc, manual) {
    doc.addPage();
    this.addSectionHeader(doc, 'FEHLERBEHEBUNG');
    
    const troubleshooting = manual.content.troubleshooting || 
      `HÄUFIGE PROBLEME UND LÖSUNGEN:

🔧 MECHANISCHE PROBLEME:
Problem: Teile passen nicht zusammen
→ Lösung: Überprüfen Sie die Ausrichtung und eventuelle Verformungen

Problem: Gelenke bewegen sich schwergängig  
→ Lösung: Schmierung prüfen, Kalibrierung überprüfen

⚡ ELEKTRISCHE PROBLEME:
Problem: Motor reagiert nicht
→ Lösung: Stromversorgung und Verkabelung prüfen

Problem: Sensoren liefern falsche Werte
→ Lösung: Kalibrierung durchführen, Kontakte reinigen

💻 SOFTWARE-PROBLEME:
Problem: Upload zur Steuerung schlägt fehl
→ Lösung: USB-Verbindung prüfen, richtige Treiber installieren

📞 WEITERE HILFE:
Bei anhaltenden Problemen wenden Sie sich an die Hersteller oder Fachforen.`;
    
    this.addBodyText(doc, troubleshooting);
  }

  /**
   * Quellen und Referenzen
   */
  async generateSources(doc, manual) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }
    
    this.addSectionHeader(doc, 'QUELLEN UND REFERENZEN');
    
    const sources = manual.content.sources || 
      `Diese AI-generierte Anleitung basiert auf öffentlich verfügbaren Informationen 
und den Original-Handbüchern der Komponentenhersteller.

WICHTIGER HINWEIS:
Konsultieren Sie bei Problemen immer die aktuellen Original-Handbücher der 
jeweiligen Hersteller. Diese Anleitung dient nur als zusätzliche Hilfestellung.`;
    
    this.addBodyText(doc, sources);
    
    // Quellen-Liste (falls vorhanden)
    if (manual.sources && manual.sources.length > 0) {
      this.addBodyText(doc, '\nVERWENDETE QUELLEN:');
      
      manual.sources.forEach((source, index) => {
        const sourceText = `${index + 1}. ${source.name} (${source.manufacturer})`;
        this.addBodyText(doc, sourceText, { indented: true });
      });
    }
  }

  /**
   * Rechtliche Hinweise
   */
  async generateLegalNotice(doc, manual) {
    if (doc.y > doc.page.height - 300) {
      doc.addPage();
    }
    
    this.addSectionHeader(doc, 'RECHTLICHE HINWEISE');
    
    const legal = manual.content.legalNotice || manual.legal?.disclaimer || 
      `WICHTIGER RECHTLICHER HINWEIS:

Diese Bauanleitung wurde mittels künstlicher Intelligenz zusammengestellt und 
dient ausschließlich als Hilfestellung für DIY-Projekte.

KEINE GEWÄHRLEISTUNG:
• Wir übernehmen keinerlei Gewährleistung für die Vollständigkeit oder Richtigkeit
• Die Nutzung erfolgt auf eigene Gefahr und Verantwortung  
• Schäden jeder Art sind ausgeschlossen

HAFTUNGSAUSSCHLUSS:
Der Anbieter haftet nicht für Schäden, die durch die Nutzung dieser Anleitung entstehen.

URHEBERRECHT:
Alle Marken und Produktnamen sind Eigentum ihrer jeweiligen Inhaber.`;
    
    // Legal Notice in Box
    const boxY = doc.y;
    const legalHeight = 200;
    
    doc.rect(this.branding.spacing.margin, boxY, 
             doc.page.width - (this.branding.spacing.margin * 2), legalHeight)
       .strokeColor(this.branding.colors.textLight)
       .stroke();
    
    doc.fillColor(this.branding.colors.text)
       .font(this.branding.fonts.body)
       .fontSize(8)
       .text(legal, this.branding.spacing.margin + 10, boxY + 15, {
         width: doc.page.width - (this.branding.spacing.margin * 2) - 20,
         lineGap: 2
       });
  }

  /**
   * Hilfsfunktionen für PDF-Formatierung
   */
  
  addSectionHeader(doc, title) {
    const { colors, fonts, spacing } = this.branding;
    
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    
    doc.fillColor(colors.primary)
       .font(fonts.heading)
       .fontSize(16)
       .text(title, spacing.margin, doc.y + spacing.sectionGap);
    
    // Unterstrich
    const lineY = doc.y + 5;
    doc.strokeColor(colors.primary)
       .lineWidth(2)
       .moveTo(spacing.margin, lineY)
       .lineTo(doc.page.width - spacing.margin, lineY)
       .stroke();
    
    doc.y = lineY + spacing.sectionGap;
  }

  addSubsectionHeader(doc, title) {
    const { colors, fonts, spacing } = this.branding;
    
    if (doc.y > doc.page.height - 80) {
      doc.addPage();
    }
    
    doc.fillColor(colors.secondary)
       .font(fonts.heading)
       .fontSize(13)
       .text(title, spacing.margin, doc.y + spacing.stepGap);
    
    doc.y += spacing.stepGap;
  }

  addBodyText(doc, text, options = {}) {
    const {
      indented = false,
      style = 'normal',
      color = this.branding.colors.text,
      fontSize = 10
    } = options;
    
    const font = style === 'italic' ? 'Helvetica-Oblique' : this.branding.fonts.body;
    const leftMargin = indented ? this.branding.spacing.margin + 20 : this.branding.spacing.margin;
    
    doc.fillColor(color)
       .font(font)
       .fontSize(fontSize)
       .text(text, leftMargin, doc.y + 5, {
         width: doc.page.width - leftMargin - this.branding.spacing.margin,
         lineGap: 3
       });
    
    doc.y += 10;
  }

  addStepBox(doc, stepNumber, stepText) {
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    
    const { colors, spacing } = this.branding;
    const boxHeight = Math.max(60, doc.heightOfString(stepText, { width: 400 }) + 30);
    
    // Step number circle
    doc.circle(spacing.margin + 15, doc.y + 25, 12)
       .fillColor(colors.accent)
       .fill()
       .fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(stepNumber.toString(), spacing.margin + 11, doc.y + 20);
    
    // Step text box
    doc.rect(spacing.margin + 35, doc.y + 5, 
             doc.page.width - spacing.margin * 2 - 40, boxHeight - 10)
       .strokeColor(colors.accent)
       .lineWidth(1)
       .stroke();
    
    // Step text
    doc.fillColor(colors.text)
       .font(this.branding.fonts.body)
       .fontSize(9)
       .text(stepText, spacing.margin + 45, doc.y + 15, {
         width: doc.page.width - spacing.margin * 2 - 60,
         lineGap: 2
       });
    
    doc.y += boxHeight + 10;
  }

  addSpacing(doc, amount) {
    doc.y += amount;
  }

  addWatermark(doc, text) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#000000', 0.1)
         .font('Helvetica-Bold')
         .fontSize(48)
         .text(text, 0, doc.page.height / 2, {
           width: doc.page.width,
           align: 'center',
           rotate: -45
         });
    }
  }

  parseInstructionSections(instructions) {
    // Einfache Heuristik um AI-Content in Abschnitte zu teilen
    const sections = [];
    const lines = instructions.split('\n');
    let currentSection = null;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Neue Sektion erkennen (GROSSBUCHSTABEN oder Nummern)
      if (trimmed.match(/^(SCHRITT|PHASE|\d+\.|\w+:$)/i) && trimmed.length < 100) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmed.replace(/^\d+\.\s*/, ''),
          content: '',
          steps: []
        };
      } else if (currentSection) {
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          currentSection.steps.push(trimmed.substring(1).trim());
        } else if (trimmed.length > 0) {
          currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
        }
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Falls keine Sektionen erkannt, gesamten Text als eine Sektion
    if (sections.length === 0) {
      sections.push({
        title: 'Bauanleitung',
        content: instructions,
        steps: []
      });
    }
    
    return sections;
  }

  async ensureOutputDirectory() {
    try {
      await fs.access(this.outputPath);
    } catch {
      await fs.mkdir(this.outputPath, { recursive: true });
      logger.info('Output-Verzeichnis erstellt', { path: this.outputPath });
    }
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      await this.ensureOutputDirectory();
      
      // Test PDF erstellen
      const testDoc = new PDFDocument();
      testDoc.text('Health Check');
      testDoc.end();
      
      return {
        status: 'healthy',
        outputPath: this.outputPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('PDF Generator Health Check failed', { error: error.message });
      return {
        status: 'down',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new PDFGeneratorService();