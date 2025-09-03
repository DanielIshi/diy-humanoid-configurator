# Konstruktionsanleitungs-System (Manual System)

Das Manual-System ist ein intelligentes Compiler-System für DIY-Bauanleitungen, das aus individuellen Komponenten-Anleitungen eine optimierte Gesamtbauanleitung erstellt.

## 🎯 Features

### Backend (ManualService)
- **Dynamische Anleitung**: Basierend auf ausgewählten Komponenten
- **Abhängigkeitsauflösung**: Automatische Optimierung der Montagereihenfolge
- **Werkzeugliste**: Generierung basierend auf benötigten Komponenten
- **Zeitschätzung**: Realistische Bauzeit-Kalkulation inkl. Puffer
- **Sicherheitsmanagement**: Automatische Kompilierung von Sicherheitshinweisen
- **Modulare Struktur**: Jede Komponente hat ihre eigene Anleitung

### Frontend (ManualViewer)
- **Schritt-für-Schritt Navigation**: Interaktive Durchführung
- **Progress Tracking**: Fortschrittsanzeige und Schritt-Markierung
- **Print-Layout**: Optimiert für Papierausdruck
- **Export-Funktionen**: JSON und Text-Export
- **Responsive Design**: Mobile und Desktop-optimiert

### API Endpoints
- `POST /api/manual/generate` - Generiert Bauanleitung
- `POST /api/manual/validate` - Validiert Konfiguration
- `GET /api/manual/tools` - Liefert Werkzeug-Datenbank
- `GET /api/manual/components` - Verfügbare Komponenten-Anleitungen
- `GET /api/manual/export/:id` - Export in verschiedenen Formaten

## 📁 Dateistruktur

```
backend/
├── src/
│   ├── services/
│   │   └── manualService.js      # Haupt-Service für Manual-Kompilierung
│   └── routes/
│       └── manual.js             # API-Endpoints
└── test_manual.js                # Test-Skript

frontend/
└── src/
    └── components/
        └── customer/
            ├── ManualViewer.jsx      # Haupt-Anzeige-Komponente
            └── ManualGenerator.jsx   # Validierung + Vorbereitung
```

## 🔧 Verwendung

### Backend - Manual generieren
```javascript
import { manualService } from './src/services/manualService.js';

const configuration = {
  id: 'my_config',
  components: {
    frame: { id: 'frame_aluminum', name: 'Alu Rahmen', selected: true },
    motor: { id: 'servo_motor_sg90', name: 'Servo SG90', selected: true }
  }
};

const manual = await manualService.generateManual(configuration);
```

### Frontend - Manual anzeigen
```jsx
import ManualViewer from './components/customer/ManualViewer';

<ManualViewer 
  configuration={userConfiguration}
  onClose={() => setShowManual(false)}
/>
```

### API - Manual per REST
```bash
# Manual generieren
curl -X POST http://localhost:3000/api/manual/generate \
  -H "Content-Type: application/json" \
  -d '{"configuration": {...}}'

# Konfiguration validieren  
curl -X POST http://localhost:3000/api/manual/validate \
  -H "Content-Type: application/json" \
  -d '{"configuration": {...}}'
```

## 📊 Beispiel-Ausgabe

Das System generiert eine strukturierte Bauanleitung mit:

```json
{
  "id": "manual_1693838400000",
  "metadata": {
    "title": "DIY Humanoid Bauanleitung",
    "estimatedTime": {
      "formatted": { "display": "4h 36min" },
      "sessions": { "recommended": 3, "intensive": 2 }
    },
    "difficulty": "medium"
  },
  "overview": {
    "requiredTools": [...],
    "safetyNotes": [...],
    "components": [...]
  },
  "instructions": [
    {
      "id": "step_1",
      "title": "Arbeitsplatz vorbereiten",
      "description": "...",
      "estimatedTime": 15,
      "phase": "preparation",
      "steps": [...],
      "warnings": [...],
      "tools": [...] 
    }
  ]
}
```

## 🧩 Komponenten-System

### Verfügbare Beispiel-Komponenten
- **frame_aluminum**: Aluminium Rahmen (Basis)
- **servo_motor_sg90**: Servo Motor SG90
- **stepper_motor_nema17**: Stepper Motor NEMA17
- **controller_arduino**: Arduino Uno Controller
- **sensor_ultrasonic**: Ultraschall Sensor HC-SR04
- **power_supply_12v**: 12V Netzteil

### Abhängigkeits-Graph
```
frame_aluminum (Basis)
├── power_supply_12v
├── controller_arduino ← power_supply_12v
├── servo_motor_sg90 ← controller_arduino
├── stepper_motor_nema17 ← power_supply_12v
└── sensor_ultrasonic ← controller_arduino
```

## 🛠 Werkzeug-Kategorien
- **basic**: Grundwerkzeuge (Schraubendreher, Inbusschlüssel)
- **electrical**: Elektrowerkzeuge (Multimeter, Abisolierzange)
- **measurement**: Messwerkzeuge (Wasserwaage)
- **materials**: Verbrauchsmaterialien (Wärmeleitpaste)
- **software**: Software-Tools (Computer, IDE)

## ⚡ System-Test

```bash
cd backend
node test_manual.js
```

Testet:
1. Konfigurationsvalidierung
2. Abhängigkeitsprüfung
3. Schritt-Reihenfolge-Optimierung
4. Werkzeuglisten-Generierung
5. Vollständige Manual-Kompilierung
6. Beispiel-Ausgabe

## 🚀 Erweiterung

### Neue Komponente hinzufügen
```javascript
// In manualService.js
this.componentManuals.set('new_component_id', {
  name: 'Komponenten Name',
  difficulty: 'easy|medium|hard|expert',
  estimatedTime: 30, // Minuten
  requiredTools: ['tool_id1', 'tool_id2'],
  safetyNotes: ['Sicherheitshinweis 1'],
  steps: [
    {
      title: 'Schritt Titel',
      description: 'Beschreibung',
      estimatedTime: 15,
      difficulty: 'easy',
      tools: ['benötigte_tools'],
      steps: ['Unterschritt 1', 'Unterschritt 2'],
      warnings: ['Warnung falls nötig'],
      tips: ['Hilfreicher Tipp']
    }
  ]
});

// Abhängigkeiten definieren
this.dependencies.set('new_component_id', ['required_component_1']);
```

### Neue Werkzeuge hinzufügen
```javascript
this.toolDatabase.set('tool_id', {
  name: 'Werkzeugname',
  category: 'basic|electrical|measurement|materials|software',
  essential: true|false,
  alternatives: ['Alternative 1', 'Alternative 2']
});
```

## 📈 Performance

- Abhängigkeitsauflösung: O(V + E) mit topologischer Sortierung
- Manual-Kompilierung: Linear zur Anzahl Komponenten
- Speicherverbrauch: Minimal durch Lazy-Loading der Komponenten-Daten
- Response-Zeit: < 100ms für typische Konfigurationen (5-10 Komponenten)

## 🔒 Sicherheit

- Eingabe-Validierung für alle API-Endpoints  
- Schutz vor zirkulären Abhängigkeiten
- Sichere Export-Funktionen (keine Code-Injection)
- Rate-Limiting über bestehende Middleware

---

**Entwickelt für**: DIY Humanoid Configurator  
**Version**: 1.0.0  
**Letzte Aktualisierung**: September 2025