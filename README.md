# DIY Humanoid Configurator 🤖

[![CI/CD Status](https://img.shields.io/github/actions/workflow/status/username/diy-humanoid-configurator/deploy.yml?branch=main)](https://github.com/username/diy-humanoid-configurator/actions)
[![Frontend Build](https://img.shields.io/badge/frontend-Vercel-brightgreen)](https://diy-humanoid-configurator.vercel.app)
[![Backend Status](https://img.shields.io/badge/backend-Railway-blue)](https://diy-humanoid-configurator-backend.railway.app)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.0-orange)](package.json)

Ein interaktiver DIY-Humanoid-Konfigurator für die Auswahl, Kalkulation und Bestellung von Roboter-Komponenten mit integrierter KI-Beratung und automatischer Anleitung-Generierung.

## 📋 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Features](#features)
- [Architektur](#architektur)
- [Installation](#installation)
- [Entwicklung](#entwicklung)
- [Deployment](#deployment)
- [API Dokumentation](#api-dokumentation)
- [Contributing](#contributing)
- [Lizenz](#lizenz)

## 🎯 Überblick

Der DIY Humanoid Configurator ermöglicht es Benutzern, individuelle Humanoid-Roboter zu konfigurieren durch:

- **Komponentenauswahl**: Servos, Steuerungen, Sensoren, Stromversorgung
- **Automatische Kalkulation**: Einkaufs-/Verkaufspreise mit konfigurierbaren Margen
- **Payment-Integration**: Stripe, PayPal, SEPA-Unterstützung
- **KI-Berater**: LLM-basierte Beratung für optimale Konfigurationen
- **Automatische Anleitungen**: Text- und Audio-Guides für den Zusammenbau
- **Admin-Dashboard**: Bestellverwaltung und Geschäftslogik

### 🎨 Live Demo
- **Frontend**: [https://diy-humanoid-configurator.vercel.app](https://diy-humanoid-configurator.vercel.app)
- **Admin Panel**: [https://diy-humanoid-configurator.vercel.app/admin](https://diy-humanoid-configurator.vercel.app/admin)

## ✨ Features

### Benutzer-Features
- 🎛️ **Interaktiver Konfigurator** mit Presets (Starter, Walker, InMoov)
- 💰 **Echtzeit-Preiskalkulation** mit Marge-Management
- 🛒 **Warenkorb & Checkout** mit mehreren Payment-Optionen
- 🤖 **KI-Produktberater** für personalisierte Empfehlungen
- 📖 **Automatische Anleitungen** mit Text-to-Speech
- 📊 **CSV-Export** für Komponenten-Listen

### Admin-Features
- 📈 **Business Dashboard** mit Verkaufs-Metriken
- 🔧 **Komponentenverwaltung** mit Preispflege
- 📋 **Bestellmanagement** mit Status-Tracking
- 🎯 **Marge-Konfiguration** pro Komponente
- 🔄 **Automatisierte Workflows** für Bestellabwicklung

### Technische Features
- 🚀 **Progressive Web App** (PWA) Ready
- 🌐 **Multi-Language Support** (Deutsch/Englisch)
- 📱 **Responsive Design** für alle Geräte
- 🔐 **Sichere API** mit JWT-Authentication
- 📊 **Real-time Updates** via WebSockets
- 🧪 **Comprehensive Testing** (Unit, Integration, E2E)

## 🏗️ Architektur

### System-Übersicht
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│  (Node.js/      │◄──►│  (PostgreSQL/   │
│                 │    │   Express)      │    │   Prisma)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   External APIs │    │   File Storage  │
│   (Vercel)      │    │   (Stripe, LLM) │    │   (Uploads)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18 mit Vite
- **Styling**: Tailwind CSS + Shadcn/UI
- **Router**: React Router v7
- **State**: Context API + useReducer
- **Testing**: Vitest + Playwright + Testing Library

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL mit Prisma ORM
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Jest + Supertest

#### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Railway PostgreSQL
- **CDN**: Vercel Edge Network
- **Monitoring**: Railway Analytics

## 🚀 Installation

### Voraussetzungen
- Node.js 20.0.0 oder höher
- npm oder yarn
- PostgreSQL 14+ (lokal oder remote)
- Git

### Quick Start
```bash
# Repository klonen
git clone https://github.com/username/diy-humanoid-configurator.git
cd diy-humanoid-configurator

# Automatisches Setup ausführen
# Windows
.\setup.ps1

# Linux/macOS
./setup.sh

# Oder manuell:
# Dependencies installieren
npm run install:all

# Environment Setup
cp .env.example .env
# .env Datei mit deinen Werten ausfüllen

# Datenbank initialisieren
npm run db:setup

# Development Server starten
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Admin Panel: http://localhost:5174

## 🛠️ Entwicklung

### Development Scripts
```bash
# Alle Services starten
npm run dev

# Nur Frontend
npm run dev:frontend

# Nur Backend
npm run dev:backend

# Tests ausführen
npm run test           # Alle Tests
npm run test:frontend  # Frontend Tests
npm run test:backend   # Backend Tests
npm run test:e2e       # End-to-End Tests

# Code Quality
npm run lint          # ESLint prüfen
npm run lint:fix      # ESLint Fehler beheben
npm run format        # Prettier formatieren

# Datenbank
npm run db:migrate    # Migrations ausführen
npm run db:seed       # Testdaten laden
npm run db:studio     # Prisma Studio öffnen
npm run db:reset      # Datenbank zurücksetzen
```

### Projektstruktur
```
diy-humanoid-configurator/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Wiederverwendbare Komponenten
│   │   ├── pages/          # Route-spezifische Seiten
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── utils/          # Utility-Funktionen
│   │   ├── context/        # React Context
│   │   └── assets/         # Statische Assets
│   ├── public/             # Öffentliche Dateien
│   ├── tests/              # Frontend Tests
│   └── playwright.config.ts
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/    # Request Handler
│   │   ├── middleware/     # Express Middleware
│   │   ├── models/         # Prisma Models
│   │   ├── routes/         # API Routes
│   │   ├── services/       # Business Logic
│   │   └── utils/          # Backend Utilities
│   ├── tests/              # Backend Tests
│   ├── prisma/             # Datenbank Schema & Migrations
│   └── uploads/            # File Uploads
├── docs/                   # Dokumentation
├── scripts/               # Build & Deployment Scripts
└── .github/               # GitHub Actions Workflows
```

## 🌐 Deployment

### Automatisches Deployment

#### Vercel (Frontend)
```bash
# Vercel CLI installieren
npm i -g vercel

# Erstes Deployment
vercel

# Production Deployment
vercel --prod
```

#### Railway (Backend)
```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login und Setup
railway login
railway init
railway up
```

### Environment Variablen

#### Frontend (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_APP_ENV=development

# Payment (Public Keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Features
VITE_ENABLE_LLM_ADVISOR=true
VITE_ENABLE_AUDIO_GUIDES=true
```

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/humanoid_config"

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# AI Services
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### Docker Setup
```bash
# Development mit Docker Compose
docker-compose up -d

# Production Build
docker-compose -f docker-compose.prod.yml up -d

# Nur Services (ohne App)
docker-compose -f docker-compose.services.yml up -d
```

## 📚 API Dokumentation

### Basis-URLs
- **Development**: http://localhost:3001/api
- **Production**: https://diy-humanoid-configurator-backend.railway.app/api

### Hauptendpunkte

#### Komponenten
```http
GET    /api/components          # Alle Komponenten
GET    /api/components/:id      # Komponente Details
POST   /api/components          # Neue Komponente (Admin)
PUT    /api/components/:id      # Komponente aktualisieren (Admin)
DELETE /api/components/:id      # Komponente löschen (Admin)
```

#### Konfigurationen
```http
GET    /api/configurations      # Benutzerkonfigurationen
POST   /api/configurations      # Neue Konfiguration speichern
GET    /api/configurations/:id  # Spezifische Konfiguration
PUT    /api/configurations/:id  # Konfiguration aktualisieren
DELETE /api/configurations/:id  # Konfiguration löschen
```

#### Bestellungen
```http
GET    /api/orders             # Alle Bestellungen
POST   /api/orders             # Neue Bestellung erstellen
GET    /api/orders/:id         # Bestellung Details
PUT    /api/orders/:id/status  # Bestellstatus aktualisieren (Admin)
```

#### Payment
```http
POST   /api/payments/stripe/create-intent    # Stripe Payment Intent
POST   /api/payments/stripe/webhook         # Stripe Webhook
POST   /api/payments/paypal/create-order    # PayPal Order
POST   /api/payments/paypal/capture         # PayPal Capture
```

#### KI-Berater
```http
POST   /api/ai/advice          # KI-Beratung anfordern
POST   /api/ai/generate-guide  # Anleitung generieren
POST   /api/ai/tts            # Text-to-Speech
```

### API Response Format
```javascript
// Erfolgreiche Antwort
{
  "success": true,
  "data": { ... },
  "message": "Operation erfolgreich"
}

// Fehler-Antwort
{
  "success": false,
  "error": "Fehlermeldung",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## 🧪 Testing

### Test-Struktur
```bash
# Frontend Tests
npm run test:frontend          # Unit Tests (Vitest)
npm run test:frontend:watch    # Watch Mode
npm run test:frontend:ui       # Test UI
npm run test:frontend:coverage # Coverage Report

# Backend Tests
npm run test:backend           # Unit Tests (Jest)
npm run test:backend:watch     # Watch Mode
npm run test:integration       # Integration Tests

# End-to-End Tests
npm run test:e2e              # Playwright E2E Tests
npm run test:e2e:ui           # Playwright UI Mode
npm run test:e2e:debug        # Debug Mode
```

### Test Coverage Ziele
- **Frontend**: > 80% Code Coverage
- **Backend**: > 85% Code Coverage
- **E2E**: Alle kritischen User Journeys
- **API**: Alle Endpoints getestet

## 🤝 Contributing

Vielen Dank für dein Interesse am Projekt! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für detaillierte Richtlinien.

### Quick Contribute
1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Changes (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Erstelle einen Pull Request

### Code Standards
- **ESLint**: Standardkonfiguration für JavaScript/React
- **Prettier**: Code-Formatierung
- **Conventional Commits**: Commit-Message-Format
- **Tests**: Neue Features benötigen Tests

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert. Siehe [LICENSE](LICENSE) für Details.

## 🙏 Credits

- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [OpenAI](https://openai.com/) / [OpenRouter](https://openrouter.ai/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/username/diy-humanoid-configurator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/username/diy-humanoid-configurator/discussions)
- **Email**: support@diy-humanoid-configurator.com

---

**Entwickelt mit ❤️ für die DIY-Robotik-Community**