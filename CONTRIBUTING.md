# Mitwirken am DIY Humanoid Configurator

Vielen Dank für Ihr Interesse am DIY Humanoid Configurator! Diese Anleitung erklärt, wie Sie zum Projekt beitragen können.

## 🚀 Quick Start für Entwickler

### Voraussetzungen
- Node.js 20.0.0 oder höher
- Git
- PostgreSQL 14+ (oder Docker)
- Grundkenntnisse in React, Node.js und SQL

### Entwicklungsumgebung einrichten

```bash
# Repository forken und klonen
git clone https://github.com/IHR_USERNAME/diy-humanoid-configurator.git
cd diy-humanoid-configurator

# Automatisches Setup (empfohlen)
# Windows
.\setup.ps1

# Linux/macOS
./setup.sh

# Oder manuell
npm run install:all
cp .env.example .env
# .env Datei ausfüllen
npm run db:setup

# Entwicklungsserver starten
npm run dev
```

## 📋 Projektstruktur

```
diy-humanoid-configurator/
├── frontend/           # React Frontend (Port 5173)
├── backend/           # Node.js API (Port 3001)
├── docs/             # Dokumentation
├── scripts/          # Build/Deploy Scripts
└── .github/          # CI/CD Workflows
```

## 🛠️ Development Workflow

### 1. Issue erstellen oder übernehmen
- Schauen Sie in die [Issues](https://github.com/username/diy-humanoid-configurator/issues)
- Erstellen Sie ein neues Issue für Bugs oder Features
- Weisen Sie sich das Issue zu

### 2. Feature Branch erstellen
```bash
# Neuen Branch vom main Branch erstellen
git checkout main
git pull origin main
git checkout -b feature/kurze-beschreibung

# Beispiele für Branch-Namen:
# feature/payment-integration
# bugfix/servo-calculation-error
# docs/api-documentation-update
```

### 3. Entwicklung
```bash
# Entwicklungsserver starten
npm run dev

# Tests ausführen
npm run test
npm run test:e2e

# Code-Qualität prüfen
npm run lint
npm run lint:fix
```

### 4. Commit Guidelines
Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description
git commit -m "feat(components): add servo motor compatibility check"
git commit -m "fix(payment): resolve stripe webhook validation"
git commit -m "docs(api): update authentication endpoints"
git commit -m "test(orders): add integration tests for order flow"
```

#### Commit-Typen:
- `feat`: Neue Features
- `fix`: Bugfixes
- `docs`: Dokumentation
- `test`: Tests hinzufügen/ändern
- `refactor`: Code-Refactoring ohne Feature-Änderungen
- `style`: Code-Formatierung
- `ci`: CI/CD-Änderungen
- `chore`: Wartungsaufgaben

#### Scopes (optional):
- `components`: Komponenten-System
- `payment`: Payment-Integration
- `admin`: Admin-Dashboard
- `api`: Backend API
- `ui`: UI-Komponenten
- `db`: Datenbank-Änderungen

### 5. Pull Request erstellen

```bash
# Branch pushen
git push origin feature/kurze-beschreibung
```

Erstellen Sie einen PR mit:
- **Aussagekräftigem Titel** im Conventional Commits Format
- **Beschreibung** der Änderungen
- **Verweis** auf das zugehörige Issue
- **Screenshots** bei UI-Änderungen
- **Testing-Hinweise** für Reviewer

#### PR-Template:
```markdown
## Zusammenfassung
Kurze Beschreibung der Änderungen

## Änderungen
- [ ] Feature A hinzugefügt
- [ ] Bug B behoben
- [ ] Dokumentation C aktualisiert

## Testing
- [ ] Unit Tests hinzugefügt/aktualisiert
- [ ] E2E Tests laufen durch
- [ ] Manuell getestet in Chrome/Firefox

## Screenshots (bei UI-Änderungen)
[Vor/Nach Screenshots]

## Checkliste
- [ ] Code folgt den Style Guidelines
- [ ] Selbst-Review durchgeführt
- [ ] Tests hinzugefügt
- [ ] Dokumentation aktualisiert

Fixes #123
```

## 🧪 Testing Guidelines

### Frontend Tests
```bash
# Unit Tests (Vitest)
npm run test:frontend

# E2E Tests (Playwright)
npm run test:e2e

# Component Tests (Testing Library)
npm run test:frontend:watch
```

### Backend Tests
```bash
# Unit Tests (Jest)
npm run test:backend

# Integration Tests
npm run test:integration

# API Tests (Supertest)
npm run test:backend:watch
```

### Test-Struktur
```javascript
// Beispiel Frontend Test
describe('ComponentSelector', () => {
  it('should display servo motors when category is selected', async () => {
    render(<ComponentSelector category="servos" />);
    
    const servoItems = await screen.findAllByTestId('component-item');
    expect(servoItems).toHaveLength(3);
  });
});

// Beispiel Backend Test
describe('POST /api/components', () => {
  it('should create a new component with valid data', async () => {
    const response = await request(app)
      .post('/api/components')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validComponentData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

## 📝 Code Guidelines

### JavaScript/React Standards

```javascript
// ✅ Gut
const ComponentCard = ({ component, onSelect }) => {
  const { name, price, specifications } = component;
  
  const handleClick = useCallback(() => {
    onSelect(component.id);
  }, [component.id, onSelect]);

  return (
    <div 
      className="component-card p-4 border rounded hover:shadow-lg"
      onClick={handleClick}
      data-testid="component-card"
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-gray-600">€{price.toFixed(2)}</p>
    </div>
  );
};

// ❌ Schlecht
function componentCard(props) {
  return <div onClick={() => props.onSelect(props.component.id)}>
    <h3>{props.component.name}</h3>
    <p>€{props.component.price}</p>
  </div>
}
```

### Node.js/Express Standards

```javascript
// ✅ Gut
const createComponent = async (req, res, next) => {
  try {
    const validatedData = componentSchema.parse(req.body);
    const component = await componentService.create(validatedData);
    
    res.status(201).json({
      success: true,
      data: component,
      message: 'Komponente erfolgreich erstellt'
    });
  } catch (error) {
    next(error);
  }
};

// ❌ Schlecht
app.post('/components', (req, res) => {
  db.component.create(req.body).then(result => {
    res.json(result);
  }).catch(err => {
    res.status(500).json({error: err.message});
  });
});
```

### CSS/Tailwind Best Practices

```jsx
// ✅ Gut - Responsive, semantische Klassen
<div className="
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 
  gap-4 p-6 
  bg-gray-50 dark:bg-gray-900
">
  {components.map(component => (
    <ComponentCard key={component.id} component={component} />
  ))}
</div>

// ❌ Schlecht - Zu viele Klassen, unlesbar
<div className="w-full h-full bg-gray-50 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
```

## 🐛 Bug Reports

### Gute Bug Reports enthalten:
1. **Klare Beschreibung** des Problems
2. **Schritte zur Reproduktion**
3. **Erwartetes vs. tatsächliches Verhalten**
4. **Environment-Informationen** (Browser, OS, Version)
5. **Screenshots/Videos** bei UI-Bugs
6. **Console-Logs** bei JavaScript-Fehlern

### Bug Report Template:
```markdown
**Beschreibung:**
Kurze Beschreibung des Bugs

**Schritte zur Reproduktion:**
1. Gehe zu '...'
2. Klicke auf '....'
3. Scrolle nach unten zu '....'
4. Siehe Fehler

**Erwartetes Verhalten:**
Was sollte passieren

**Screenshots:**
Falls zutreffend, füge Screenshots hinzu

**Environment:**
- OS: [z.B. Windows 11]
- Browser: [z.B. Chrome 120]
- Version: [z.B. 0.7.0]

**Zusätzliche Informationen:**
Console-Logs oder andere Details
```

## ✨ Feature Requests

### Feature Request Template:
```markdown
**Feature-Beschreibung:**
Klare Beschreibung des gewünschten Features

**Problem/Use Case:**
Welches Problem löst dieses Feature?

**Vorgeschlagene Lösung:**
Wie könnte das Feature implementiert werden?

**Alternativen:**
Andere Lösungsansätze, die bedacht wurden

**Zusätzliche Informationen:**
Screenshots, Mockups, Referenzen
```

## 🎨 UI/UX Guidelines

### Design-Prinzipien
1. **Klarheit**: Interface sollte selbsterklärend sein
2. **Konsistenz**: Einheitliche Patterns und Komponenten
3. **Accessibility**: WCAG 2.1 AA Standards erfüllen
4. **Performance**: Schnelle Ladezeiten und Interaktionen
5. **Mobile-First**: Responsive Design für alle Geräte

### Farb-Palette
```css
/* Primary Colors */
--primary-blue: #2563eb;
--primary-blue-light: #3b82f6;
--primary-blue-dark: #1d4ed8;

/* Secondary Colors */
--secondary-gray: #6b7280;
--secondary-gray-light: #9ca3af;
--secondary-gray-dark: #374151;

/* Status Colors */
--success-green: #10b981;
--warning-yellow: #f59e0b;
--error-red: #ef4444;
```

## 📚 Dokumentation

### Neue Dokumentation hinzufügen
- **API-Änderungen**: `API.md` aktualisieren
- **Architektur-Änderungen**: `ARCHITECTURE.md` aktualisieren
- **Setup-Änderungen**: `README.md` aktualisieren
- **Neue Features**: Inline-Kommentare + externe Docs

### JSDoc für JavaScript
```javascript
/**
 * Berechnet den Gesamtpreis einer Konfiguration
 * @param {Object[]} components - Array von Komponenten
 * @param {number} components[].price - Preis der Komponente
 * @param {number} components[].quantity - Anzahl der Komponente
 * @param {number} globalMargin - Globale Marge in Prozent
 * @returns {Object} Preis-Kalkulation mit Gesamt- und Einzelpreisen
 * @example
 * const total = calculateTotalPrice(components, 45);
 * console.log(total.grandTotal); // 299.99
 */
const calculateTotalPrice = (components, globalMargin) => {
  // Implementation
};
```

## 🚀 Release Process

### Version Numbering (Semantic Versioning)
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): Neue Features (backward compatible)
- **PATCH** (0.0.1): Bugfixes (backward compatible)

### Release Workflow
1. Feature-Entwicklung in `feature/*` Branches
2. Pull Request zu `develop` Branch
3. Testing in Staging-Umgebung
4. Merge zu `main` Branch
5. Automatisches Deployment zu Production

## 🤝 Community Guidelines

### Verhaltenskodex
- **Respektvoll**: Behandeln Sie alle Mitwirkenden mit Respekt
- **Konstruktiv**: Geben Sie konstruktives Feedback
- **Inklusiv**: Schaffen Sie eine einladende Umgebung
- **Hilfsbereit**: Helfen Sie anderen beim Einstieg
- **Professionell**: Halten Sie Diskussionen sachlich

### Kommunikationskanäle
- **GitHub Issues**: Bug Reports, Feature Requests
- **GitHub Discussions**: Allgemeine Diskussionen
- **Pull Request Reviews**: Code-Review und Feedback

## 📞 Hilfe bekommen

### Bei Problemen:
1. Schauen Sie in die [FAQ](https://github.com/username/diy-humanoid-configurator/wiki/FAQ)
2. Durchsuchen Sie bestehende [Issues](https://github.com/username/diy-humanoid-configurator/issues)
3. Erstellen Sie ein neues Issue mit detaillierter Beschreibung
4. Fragen Sie in [Discussions](https://github.com/username/diy-humanoid-configurator/discussions)

### Setup-Probleme:
```bash
# Reset der Entwicklungsumgebung
npm run clean
rm -rf node_modules frontend/node_modules backend/node_modules
npm run install:all
npm run db:reset
```

## 📊 Projekt-Statistiken

Aktuelle Metriken:
- **Code Coverage**: Ziel >80%
- **Response Time**: <200ms für API-Endpoints
- **Bundle Size**: <500KB (Frontend)
- **Lighthouse Score**: >90 (Performance, Accessibility)

## 🙏 Anerkennung

Alle Beitragenden werden in der [Contributors](https://github.com/username/diy-humanoid-configurator/graphs/contributors) Seite aufgeführt. Besondere Beiträge werden im Repository und in Release Notes erwähnt.

---

**Vielen Dank für Ihren Beitrag zum DIY Humanoid Configurator! 🤖**

Bei Fragen oder Unklarheiten, erstellen Sie gerne ein Issue oder starten eine Diskussion. Wir helfen gerne!