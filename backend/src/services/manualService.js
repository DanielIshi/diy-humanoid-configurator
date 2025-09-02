import { logger } from '../lib/logger.js';

/**
 * Manual Service - Konstruktionsanleitungs-System für DIY Humanoid Configurator
 * 
 * Kompiliert individueller Komponenten-Anleitungen zu einer Gesamtanleitung
 * mit optimierter Reihenfolge und Abhängigkeitsauflösung
 */
export class ManualService {
  constructor() {
    this.componentManuals = new Map();
    this.dependencies = new Map();
    this.toolDatabase = new Map();
    this.timeEstimates = new Map();
    
    this.initializeComponentData();
  }

  /**
   * Hauptfunktion: Generiert komplette Bauanleitung basierend auf Konfiguration
   * @param {Object} configuration - Kundenkonfiguration mit ausgewählten Komponenten
   * @returns {Object} Kompilierte Bauanleitung
   */
  async generateManual(configuration) {
    logger.info('Generiere Bauanleitung für Konfiguration', { 
      components: Object.keys(configuration.components || {}).length 
    });

    try {
      const selectedComponents = this.extractSelectedComponents(configuration);
      const orderedSteps = this.orderSteps(selectedComponents);
      const mergedInstructions = this.mergeInstructions(orderedSteps);
      const toolList = this.generateToolList(selectedComponents);
      const totalTime = this.estimateBuildTime(mergedInstructions);
      const safetyNotes = this.compileSafetyNotes(selectedComponents);

      const manual = {
        id: `manual_${Date.now()}`,
        configuration: configuration.id || 'custom',
        metadata: {
          title: 'DIY Humanoid Bauanleitung',
          version: '1.0.0',
          generated: new Date().toISOString(),
          estimatedTime: totalTime,
          difficulty: this.calculateDifficulty(selectedComponents)
        },
        overview: {
          components: selectedComponents,
          totalSteps: mergedInstructions.length,
          requiredTools: toolList,
          safetyNotes: safetyNotes
        },
        instructions: mergedInstructions,
        appendix: {
          troubleshooting: this.generateTroubleshooting(selectedComponents),
          maintenance: this.generateMaintenance(selectedComponents),
          upgrades: this.suggestUpgrades(selectedComponents)
        }
      };

      logger.info('Bauanleitung erfolgreich generiert', {
        steps: mergedInstructions.length,
        estimatedTime: totalTime,
        tools: toolList.length
      });

      return manual;
    } catch (error) {
      logger.error('Fehler beim Generieren der Bauanleitung', { error: error.message });
      throw new Error(`Manual generation failed: ${error.message}`);
    }
  }

  /**
   * Optimiert Reihenfolge der Montageschritte basierend auf Abhängigkeiten
   * @param {Array} components - Liste der ausgewählten Komponenten
   * @returns {Array} Optimierte Reihenfolge der Komponenten
   */
  orderSteps(components) {
    logger.debug('Optimiere Montageschritt-Reihenfolge', { components: components.length });

    // Topological Sort für Abhängigkeitsauflösung
    const visited = new Set();
    const visiting = new Set();
    const sorted = [];

    const visit = (componentId) => {
      if (visiting.has(componentId)) {
        throw new Error(`Zirkuläre Abhängigkeit erkannt: ${componentId}`);
      }
      if (visited.has(componentId)) {
        return;
      }

      visiting.add(componentId);
      
      const deps = this.dependencies.get(componentId) || [];
      deps.forEach(depId => {
        if (components.find(c => c.id === depId)) {
          visit(depId);
        }
      });

      visiting.delete(componentId);
      visited.add(componentId);
      sorted.push(components.find(c => c.id === componentId));
    };

    // Erst Komponenten ohne Abhängigkeiten
    const withoutDeps = components.filter(c => 
      !this.dependencies.has(c.id) || this.dependencies.get(c.id).length === 0
    );
    
    withoutDeps.forEach(comp => visit(comp.id));

    // Dann restliche Komponenten
    components.forEach(comp => {
      if (!visited.has(comp.id)) {
        visit(comp.id);
      }
    });

    return sorted.filter(Boolean);
  }

  /**
   * Führt individuelle Anleitungen zu Gesamtanleitung zusammen
   * @param {Array} orderedComponents - Komponenten in optimaler Reihenfolge
   * @returns {Array} Zusammengeführte Anweisungen
   */
  mergeInstructions(orderedComponents) {
    logger.debug('Führe Anleitungen zusammen', { components: orderedComponents.length });

    const mergedSteps = [];
    let stepCounter = 1;

    // Vorbereitung und allgemeine Schritte
    mergedSteps.push({
      id: `step_${stepCounter++}`,
      phase: 'preparation',
      title: 'Arbeitsplatz vorbereiten',
      description: 'Richten Sie einen sauberen, gut beleuchteten Arbeitsplatz ein.',
      estimatedTime: 15,
      difficulty: 'easy',
      warnings: ['Ausreichend Platz für alle Komponenten einplanen'],
      tools: ['Arbeitsplatz', 'Gute Beleuchtung'],
      materials: [],
      steps: [
        'Arbeitsplatz freimachen und reinigen',
        'Alle Komponenten auspacken und prüfen',
        'Werkzeuge bereitlegen',
        'Anleitung durchlesen'
      ]
    });

    // Komponentenspezifische Schritte
    orderedComponents.forEach(component => {
      const manual = this.componentManuals.get(component.id);
      if (manual && manual.steps) {
        manual.steps.forEach(step => {
          mergedSteps.push({
            id: `step_${stepCounter++}`,
            componentId: component.id,
            componentName: component.name,
            phase: this.getPhaseForComponent(component.type),
            title: `${component.name}: ${step.title}`,
            description: step.description,
            estimatedTime: step.estimatedTime,
            difficulty: step.difficulty,
            warnings: step.warnings || [],
            tools: step.tools || [],
            materials: step.materials || [component.name],
            steps: step.steps || [],
            images: step.images || [],
            tips: step.tips || []
          });
        });
      }
    });

    // Finale Tests und Kalibrierung
    mergedSteps.push({
      id: `step_${stepCounter++}`,
      phase: 'finalization',
      title: 'System-Tests durchführen',
      description: 'Führen Sie umfassende Funktionstests durch.',
      estimatedTime: 45,
      difficulty: 'medium',
      warnings: ['Niemals unter Strom arbeiten', 'Alle Verbindungen vor Einschalten prüfen'],
      tools: ['Multimeter', 'Software'],
      materials: ['Testprogramm'],
      steps: [
        'Alle elektrischen Verbindungen prüfen',
        'Software hochladen und konfigurieren',
        'Bewegungstests durchführen',
        'Sensoren kalibrieren',
        'Endtest aller Funktionen'
      ]
    });

    return mergedSteps;
  }

  /**
   * Generiert komplette Werkzeugliste basierend auf Komponenten
   * @param {Array} components - Ausgewählte Komponenten
   * @returns {Array} Benötigte Werkzeuge mit Details
   */
  generateToolList(components) {
    logger.debug('Generiere Werkzeugliste', { components: components.length });

    const toolsSet = new Set();
    const toolDetails = [];

    // Sammle alle benötigten Werkzeuge
    components.forEach(component => {
      const manual = this.componentManuals.get(component.id);
      if (manual && manual.requiredTools) {
        manual.requiredTools.forEach(toolId => {
          if (!toolsSet.has(toolId)) {
            toolsSet.add(toolId);
            const toolInfo = this.toolDatabase.get(toolId) || {
              name: toolId,
              category: 'general',
              essential: true,
              alternatives: []
            };
            toolDetails.push(toolInfo);
          }
        });
      }
    });

    // Sortiere nach Kategorie und Wichtigkeit
    return toolDetails.sort((a, b) => {
      if (a.essential !== b.essential) {
        return b.essential ? 1 : -1;
      }
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Schätzt Gesamtbauzeit basierend auf Schritten
   * @param {Array} steps - Alle Montageschritte
   * @returns {Object} Zeitschätzung mit Details
   */
  estimateBuildTime(steps) {
    const totalMinutes = steps.reduce((sum, step) => sum + (step.estimatedTime || 30), 0);
    
    // Puffer für unvorhergesehene Probleme (20%)
    const bufferMinutes = Math.ceil(totalMinutes * 0.2);
    const totalWithBuffer = totalMinutes + bufferMinutes;

    return {
      total: totalWithBuffer,
      breakdown: {
        assembly: totalMinutes,
        buffer: bufferMinutes
      },
      sessions: {
        recommended: Math.ceil(totalWithBuffer / 120), // 2h Sitzungen
        intensive: Math.ceil(totalWithBuffer / 240) // 4h Sitzungen
      },
      formatted: {
        hours: Math.floor(totalWithBuffer / 60),
        minutes: totalWithBuffer % 60,
        display: `${Math.floor(totalWithBuffer / 60)}h ${totalWithBuffer % 60}min`
      }
    };
  }

  /**
   * Extrahiert ausgewählte Komponenten aus Konfiguration
   * @private
   */
  extractSelectedComponents(configuration) {
    const components = [];
    
    if (configuration.components) {
      Object.entries(configuration.components).forEach(([type, component]) => {
        if (component && component.selected) {
          components.push({
            id: component.id || `${type}_${Date.now()}`,
            type: type,
            name: component.name || type,
            model: component.model,
            specifications: component.specifications || {}
          });
        }
      });
    }

    return components;
  }

  /**
   * Kompiliert Sicherheitshinweise
   * @private
   */
  compileSafetyNotes(components) {
    const safetyNotes = [
      'Vor Arbeitsbeginn Anleitung vollständig lesen',
      'Arbeitsplatz sauber und aufgeräumt halten',
      'Bei elektrischen Arbeiten Strom abschalten',
      'Schutzbrille bei mechanischen Arbeiten tragen'
    ];

    components.forEach(component => {
      const manual = this.componentManuals.get(component.id);
      if (manual && manual.safetyNotes) {
        safetyNotes.push(...manual.safetyNotes);
      }
    });

    return [...new Set(safetyNotes)]; // Duplikate entfernen
  }

  /**
   * Berechnet Gesamtschwierigkeit
   * @private
   */
  calculateDifficulty(components) {
    const difficulties = { easy: 1, medium: 2, hard: 3, expert: 4 };
    let totalDifficulty = 0;
    let count = 0;

    components.forEach(component => {
      const manual = this.componentManuals.get(component.id);
      if (manual && manual.difficulty) {
        totalDifficulty += difficulties[manual.difficulty] || 2;
        count++;
      }
    });

    if (count === 0) return 'medium';

    const avgDifficulty = totalDifficulty / count;
    if (avgDifficulty <= 1.5) return 'easy';
    if (avgDifficulty <= 2.5) return 'medium';
    if (avgDifficulty <= 3.5) return 'hard';
    return 'expert';
  }

  /**
   * Bestimmt Phase für Komponententyp
   * @private
   */
  getPhaseForComponent(type) {
    const phaseMapping = {
      'frame': 'structure',
      'joints': 'structure', 
      'motors': 'actuation',
      'sensors': 'sensing',
      'controller': 'electronics',
      'power': 'electronics',
      'skin': 'finishing'
    };
    return phaseMapping[type] || 'assembly';
  }

  /**
   * Generiert Troubleshooting-Sektion
   * @private
   */
  generateTroubleshooting(components) {
    return {
      common: [
        {
          problem: 'Komponente passt nicht',
          solution: 'Überprüfen Sie die Ausrichtung und eventuelle Verformungen'
        },
        {
          problem: 'Elektrische Verbindung funktioniert nicht',
          solution: 'Kontakte reinigen und Verkabelung prüfen'
        }
      ],
      electrical: [
        {
          problem: 'Motor bewegt sich nicht',
          solution: 'Stromversorgung und Controller-Verbindung prüfen'
        }
      ]
    };
  }

  /**
   * Generiert Wartungshinweise
   * @private
   */
  generateMaintenance(components) {
    return {
      daily: ['Sichtprüfung auf Beschädigungen'],
      weekly: ['Gelenke auf Beweglichkeit prüfen', 'Software-Updates prüfen'],
      monthly: ['Tiefere Inspektion aller Komponenten', 'Kalibrierung prüfen'],
      yearly: ['Komplette Demontage und Reinigung', 'Verschleißteile ersetzen']
    };
  }

  /**
   * Schlägt Upgrade-Möglichkeiten vor
   * @private
   */
  suggestUpgrades(components) {
    return [
      'Erweiterte Sensoren für bessere Wahrnehmung',
      'Leistungsfähigere Motoren für präzisere Bewegungen',
      'Verbesserter Controller für mehr Rechenleistung'
    ];
  }

  /**
   * Initialisiert Komponentendaten und Abhängigkeiten
   * @private
   */
  initializeComponentData() {
    // RAHMEN & STRUKTUR
    this.componentManuals.set('frame_aluminum', {
      name: 'Aluminium Rahmen',
      difficulty: 'easy',
      estimatedTime: 45,
      requiredTools: ['allen_key_set', 'screwdriver_phillips', 'level'],
      safetyNotes: ['Scharfe Kanten vermeiden', 'Schutzbrille tragen', 'Handschuhe verwenden'],
      steps: [
        {
          title: 'Rahmenteile vorbereiten',
          description: 'Überprüfen und vorbereiten aller Rahmenkomponenten.',
          estimatedTime: 15,
          difficulty: 'easy',
          tools: ['level'],
          steps: [
            'Alle Rahmenteile auspacken und auf Vollständigkeit prüfen',
            'Profile auf Geradheit und Unbeschädigtheit überprüfen',
            'Verbindungselemente sortieren und bereitstellen',
            'Arbeitsplatz für Montage vorbereiten'
          ],
          tips: ['Profile vor Montage leicht anschleifen für bessere Verbindung']
        },
        {
          title: 'Hauptrahmen montieren',
          description: 'Montieren Sie die Aluminium-Rahmenteile zur Grundstruktur.',
          estimatedTime: 30,
          difficulty: 'easy',
          tools: ['allen_key_set', 'level'],
          steps: [
            'Hauptrahmen gemäß Explosionszeichnung zusammensetzen',
            'Verbindungsschrauben einsetzen aber nur handfest anziehen',
            'Rechtwinkligkeit mit Wasserwaage prüfen',
            'Diagonalen messen für Parallelität',
            'Schrauben gleichmäßig und kreuzweise festziehen'
          ],
          warnings: ['Nicht zu fest anziehen - Aluminium kann sich verformen']
        }
      ]
    });

    // MOTOREN & ANTRIEB
    this.componentManuals.set('servo_motor_sg90', {
      name: 'Servo Motor SG90',
      difficulty: 'medium',
      estimatedTime: 30,
      requiredTools: ['screwdriver_phillips', 'screwdriver_flathead', 'wire_strippers'],
      safetyNotes: ['Motor nicht überlasten', 'Richtige Spannung beachten'],
      steps: [
        {
          title: 'Motor am Rahmen befestigen',
          description: 'Befestigen Sie den Servo-Motor mit den mitgelieferten Schrauben am vorgesehenen Rahmenplatz.',
          estimatedTime: 15,
          difficulty: 'easy',
          tools: ['screwdriver_phillips'],
          steps: [
            'Montagelöcher am Rahmen identifizieren',
            'Servo-Horn abnehmen falls montiert',
            'Motor in Position bringen und ausrichten',
            'Schrauben einsetzen und handfest anziehen',
            'Position nochmals prüfen und festziehen'
          ],
          warnings: ['Nicht zu fest anziehen - Gewinde können ausreißen'],
          tips: ['Servo-Horn erst nach Kalibrierung montieren']
        },
        {
          title: 'Verkabelung anschließen',
          description: 'Verbinden Sie das Servokabel mit dem Controller.',
          estimatedTime: 15,
          difficulty: 'medium',
          tools: ['wire_strippers'],
          steps: [
            'Controller-Port identifizieren (PWM-Ausgang)',
            'Servo-Stecker ausrichten (Rot=+, Braun=-, Orange=Signal)',
            'Vorsichtig einstecken bis Klick hörbar',
            'Kabel ordentlich verlegen und fixieren',
            'Verbindung testen durch leichtes Ziehen'
          ],
          warnings: ['Polarität beachten', 'Nie unter Strom verbinden']
        }
      ]
    });

    this.componentManuals.set('stepper_motor_nema17', {
      name: 'Stepper Motor NEMA17',
      difficulty: 'hard',
      estimatedTime: 60,
      requiredTools: ['allen_key_set', 'wire_strippers', 'multimeter', 'thermal_paste'],
      safetyNotes: ['Hohe Ströme - Vorsicht beim Verkabeln', 'Motor kann heiß werden'],
      steps: [
        {
          title: 'Motor mechanisch montieren',
          description: 'Befestigung des NEMA17 Motors mit Kühlkörper.',
          estimatedTime: 25,
          difficulty: 'medium',
          tools: ['allen_key_set', 'thermal_paste'],
          steps: [
            'Kühlkörper mit Wärmeleitpaste auf Motor aufbringen',
            'Motor an vorgesehener Position ausrichten',
            'Mit M3 Schrauben befestigen',
            'Motorwelle auf freie Bewegung prüfen'
          ],
          warnings: ['Motor wird heiß - Kühlkörper ist notwendig']
        },
        {
          title: 'Treiber anschließen',
          description: 'Verkabelung mit Stepper-Treiber.',
          estimatedTime: 35,
          difficulty: 'hard',
          tools: ['wire_strippers', 'multimeter'],
          steps: [
            'Treiber-Einstellungen überprüfen (Strom, Mikroschritt)',
            'Motorkabel entsprechend Farbcode anschließen',
            'Stromversorgung für Treiber anschließen',
            'Signalleitungen zum Controller führen',
            'Alle Verbindungen mit Multimeter prüfen'
          ],
          warnings: ['Falsche Verkabelung kann Motor oder Treiber zerstören']
        }
      ]
    });

    // ELEKTRONIK & STEUERUNG
    this.componentManuals.set('controller_arduino', {
      name: 'Arduino Uno Controller',
      difficulty: 'medium',
      estimatedTime: 40,
      requiredTools: ['screwdriver_phillips', 'wire_strippers', 'computer'],
      safetyNotes: ['ESD-Schutz beachten', 'Korrekte Spannung verwenden'],
      steps: [
        {
          title: 'Arduino am Rahmen befestigen',
          description: 'Sichere Montage des Controllers.',
          estimatedTime: 15,
          difficulty: 'easy',
          tools: ['screwdriver_phillips'],
          steps: [
            'Montageplatz am Rahmen vorbereiten',
            'Arduino mit Abstandshaltern montieren',
            'Schrauben festziehen',
            'Zugänglichkeit aller Anschlüsse prüfen'
          ],
          tips: ['Abstandshalter verwenden um Kurzschlüsse zu vermeiden']
        },
        {
          title: 'Grundverkabelung',
          description: 'Stromversorgung und grundlegende Verkabelung.',
          estimatedTime: 25,
          difficulty: 'medium',
          tools: ['wire_strippers'],
          steps: [
            'Stromversorgung anschließen (5V/12V je nach Bedarf)',
            'Masse-Verbindungen herstellen',
            'Signal-Leitungen für Sensoren/Aktuatoren vorbereiten',
            'Kabelmanagement einrichten'
          ],
          warnings: ['Polarität der Stromversorgung beachten']
        }
      ]
    });

    // SENSOREN
    this.componentManuals.set('sensor_ultrasonic', {
      name: 'Ultraschall Sensor HC-SR04',
      difficulty: 'easy',
      estimatedTime: 20,
      requiredTools: ['screwdriver_phillips', 'wire_strippers'],
      safetyNotes: ['Sensor nicht fallen lassen - empfindlich'],
      steps: [
        {
          title: 'Sensor montieren',
          description: 'Befestigung des Ultraschall-Sensors.',
          estimatedTime: 10,
          difficulty: 'easy',
          tools: ['screwdriver_phillips'],
          steps: [
            'Halterung am gewünschten Ort befestigen',
            'Sensor in Halterung einsetzen',
            'Ausrichtung für optimale Messung einstellen'
          ],
          tips: ['Sensor sollte freie Sicht haben, keine Hindernisse']
        },
        {
          title: 'Verkabelung',
          description: 'Anschluss an den Controller.',
          estimatedTime: 10,
          difficulty: 'easy',
          tools: ['wire_strippers'],
          steps: [
            'VCC an 5V anschließen',
            'GND an Masse anschließen',
            'Trig an digitalen Pin anschließen',
            'Echo an digitalen Pin anschließen'
          ]
        }
      ]
    });

    // STROMVERSORGUNG
    this.componentManuals.set('power_supply_12v', {
      name: '12V Netzteil',
      difficulty: 'medium',
      estimatedTime: 35,
      requiredTools: ['screwdriver_phillips', 'wire_strippers', 'multimeter'],
      safetyNotes: ['Niemals unter Spannung arbeiten', 'Erdung beachten'],
      steps: [
        {
          title: 'Netzteil montieren',
          description: 'Sichere Installation des Netzteils.',
          estimatedTime: 15,
          difficulty: 'easy',
          tools: ['screwdriver_phillips'],
          steps: [
            'Geeigneten Platz mit Belüftung wählen',
            'Netzteil mit Schrauben befestigen',
            'Kabelzugang prüfen'
          ],
          warnings: ['Ausreichend Belüftung sicherstellen - Überhitzungsgefahr']
        },
        {
          title: 'Verkabelung und Test',
          description: 'Anschluss und Funktionstest.',
          estimatedTime: 20,
          difficulty: 'medium',
          tools: ['wire_strippers', 'multimeter'],
          steps: [
            'Ausgangsspannung mit Multimeter messen',
            'Kabel zu den Verbrauchern verlegen',
            'Sicherungen einbauen',
            'Funktion aller Anschlüsse testen'
          ],
          warnings: ['Vor Einschalten alle Verbindungen prüfen']
        }
      ]
    });

    // ABHÄNGIGKEITEN DEFINIEREN
    this.dependencies.set('servo_motor_sg90', ['frame_aluminum', 'controller_arduino']);
    this.dependencies.set('stepper_motor_nema17', ['frame_aluminum', 'power_supply_12v']);
    this.dependencies.set('controller_arduino', ['frame_aluminum', 'power_supply_12v']);
    this.dependencies.set('sensor_ultrasonic', ['frame_aluminum', 'controller_arduino']);
    this.dependencies.set('power_supply_12v', ['frame_aluminum']);

    // ERWEITERTE WERKZEUGDATENBANK
    this.toolDatabase.set('screwdriver_phillips', {
      name: 'Kreuzschlitzschraubendreher',
      category: 'basic',
      essential: true,
      alternatives: ['Akkuschrauber mit Kreuzschlitz-Bit']
    });

    this.toolDatabase.set('screwdriver_flathead', {
      name: 'Schlitzschraubendreher',
      category: 'basic', 
      essential: true,
      alternatives: ['Universalschraubendreher']
    });

    this.toolDatabase.set('allen_key_set', {
      name: 'Inbusschlüssel-Set',
      category: 'basic',
      essential: true,
      alternatives: ['Akkuschrauber mit Inbus-Bits']
    });

    this.toolDatabase.set('wire_strippers', {
      name: 'Abisolierzange',
      category: 'electrical',
      essential: true,
      alternatives: ['Universalmesser (mit Vorsicht)']
    });

    this.toolDatabase.set('multimeter', {
      name: 'Multimeter',
      category: 'electrical',
      essential: true,
      alternatives: ['Spannungsprüfer (eingeschränkt)']
    });

    this.toolDatabase.set('level', {
      name: 'Wasserwaage',
      category: 'measurement',
      essential: false,
      alternatives: ['Smartphone-App mit Wasserwaage']
    });

    this.toolDatabase.set('thermal_paste', {
      name: 'Wärmeleitpaste',
      category: 'materials',
      essential: false,
      alternatives: ['Wärmeleitpad']
    });

    this.toolDatabase.set('computer', {
      name: 'Computer mit USB',
      category: 'software',
      essential: true,
      alternatives: ['Laptop', 'Raspberry Pi']
    });
  }
}

export const manualService = new ManualService();