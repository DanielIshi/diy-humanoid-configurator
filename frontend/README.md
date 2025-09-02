# DIY Humanoid Configurator - Frontend

React-basierte Frontend-Anwendung mit getrennten UI-Bereichen für Kunden und Admin.

## Struktur

### Customer Interface (`/`)
- **Konfigurator**: Komponenten-Auswahl, Presets, Mengen
- **Kostenübersicht**: EK/VK-Kalkulation, CSV-Export, Bestellung erstellen
- **Berater**: LLM-Chat für Produktberatung
- **Guides**: Automatische Anleitung generieren mit Audio-Ausgabe

### Admin Panel (`/admin`)
- **Bestellverwaltung**: Status-Tracking, Zahlungs-Simulation
- **Payment-Provider**: Stripe/PayPal/SEPA Konfiguration
- **Auto-Workflow**: Simulierte Bestell-Abwicklung

## Technologie-Stack

- **React 18** mit Hooks
- **React Router** für SPA-Navigation
- **Context API** für State Management
- **Tailwind CSS** für Styling
- **Vite** als Build-Tool
- **Playwright** für E2E-Tests

## Entwicklung

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Für Admin-Panel auf separatem Port
npm run serve:admin

# E2E Tests
npm run test:e2e

# Production Build
npm run build
```

## Deployment-Hinweise

- Customer-Interface wird auf Root-Path (`/`) bereitgestellt
- Admin-Panel läuft auf separatem Endpoint (`/admin`)
- State wird in localStorage persistiert (Demo-Zwecke)
- Für Produktion: Backend-Integration für echte Payments und sichere API-Keys erforderlich

## Sicherheit

- Admin-Bereich sollte in Produktion mit Authentication geschützt werden
- API-Keys werden aktuell im localStorage gespeichert (nur für Demo geeignet)
- Für echte Zahlungen: Server-seitige Webhook-Verarbeitung implementieren