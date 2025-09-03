# System-Architektur - DIY Humanoid Configurator

## Architektur-Übersicht

Der DIY Humanoid Configurator folgt einer modernen, skalierbaren **3-Tier-Architektur** mit klarer Trennung von Frontend, Backend und Datenschicht.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │     Business    │    │      Data       │
│     Layer       │    │      Logic      │    │     Layer       │
│                 │    │     Layer       │    │                 │
│  React Frontend │◄──►│  Express API    │◄──►│  PostgreSQL     │
│  (Vite/Tailwind)│    │  (Node.js)      │    │  (Prisma ORM)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │  External APIs  │    │  File Storage   │
│   (Vercel)      │    │ (Stripe, OpenAI)│    │  (Local/Cloud)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technologie-Stack

### Frontend (Presentation Layer)
- **Framework**: React 18 mit TypeScript
- **Build Tool**: Vite (ES Modules, HMR)
- **Styling**: Tailwind CSS + Shadcn/UI
- **State Management**: React Context + useReducer
- **Router**: React Router v7
- **Testing**: Vitest, Playwright, Testing Library
- **PWA**: Service Worker, Manifest

### Backend (Business Logic Layer)
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Language**: JavaScript (ES Modules)
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet, CORS, Cookie-Parser
- **Logging**: Morgan + Custom Logger
- **Testing**: Jest + Supertest

### Datenschicht (Data Layer)
- **Datenbank**: PostgreSQL 15+
- **ORM**: Prisma
- **Cache**: Redis (optional)
- **Datei-Storage**: Lokales Filesystem (entwicklung) / Cloud Storage (Produktion)
- **Migrationen**: Prisma Migrate
- **Seeding**: Custom Seed Scripts

### Infrastructure & DevOps
- **Frontend Hosting**: Vercel (Edge Functions, CDN)
- **Backend Hosting**: Railway (Container Platform)
- **Database Hosting**: Railway PostgreSQL
- **CI/CD**: GitHub Actions
- **Container**: Docker + Docker Compose
- **Monitoring**: Railway Analytics + Custom Metrics

---

## Detaillierte Komponentenarchitektur

### Frontend-Architektur

```
frontend/
├── src/
│   ├── components/           # Wiederverwendbare UI-Komponenten
│   │   ├── ui/              # Basis-UI-Komponenten (shadcn)
│   │   ├── forms/           # Formulare und Validierung
│   │   ├── layout/          # Layout-Komponenten
│   │   └── business/        # Business-spezifische Komponenten
│   ├── pages/               # Route-spezifische Seiten
│   │   ├── configurator/    # Konfigurator-Interface
│   │   ├── admin/           # Admin-Dashboard
│   │   ├── auth/            # Authentifizierung
│   │   └── checkout/        # Bestellprozess
│   ├── hooks/               # Custom React Hooks
│   │   ├── useApi.js        # API-Integration
│   │   ├── useAuth.js       # Authentifizierung
│   │   ├── useCart.js       # Warenkorb-Logic
│   │   └── useConfig.js     # Konfiguration-State
│   ├── context/             # React Context Providers
│   │   ├── AuthContext.jsx  # User-Authentifizierung
│   │   ├── CartContext.jsx  # Warenkorb-State
│   │   ├── ConfigContext.jsx# Konfiguration-State
│   │   └── ThemeContext.jsx # UI-Theme-Verwaltung
│   ├── services/            # API-Services und HTTP-Client
│   │   ├── api.js           # Base HTTP-Client (Axios)
│   │   ├── auth.js          # Authentifizierung-Service
│   │   ├── components.js    # Komponenten-API
│   │   ├── orders.js        # Bestellungen-API
│   │   └── ai.js            # KI-Services-API
│   ├── utils/               # Utility-Funktionen
│   │   ├── calculations.js  # Preis-Kalkulationen
│   │   ├── validation.js    # Client-side Validierung
│   │   ├── storage.js       # LocalStorage Wrapper
│   │   └── constants.js     # App-weite Konstanten
│   ├── assets/              # Statische Assets
│   │   ├── images/          # Bilder und Icons
│   │   ├── audio/           # Audio-Dateien
│   │   └── docs/            # Dokumentation (PDF)
│   └── styles/              # Globale Styles und Themes
```

#### Komponenten-Hierarchie
```
App
├── Router
├── AuthProvider
│   ├── CartProvider
│   │   ├── ConfigProvider
│   │   │   ├── Header
│   │   │   ├── Sidebar (Konfigurator)
│   │   │   ├── MainContent
│   │   │   │   ├── ComponentGrid
│   │   │   │   ├── ConfigurationPanel
│   │   │   │   └── PricingDisplay
│   │   │   ├── Cart
│   │   │   └── Footer
│   │   └── AdminLayout (Admin-Bereich)
│   │       ├── AdminSidebar
│   │       ├── Dashboard
│   │       ├── ComponentManager
│   │       └── OrderManager
│   └── CheckoutFlow
│       ├── OrderSummary
│       ├── PaymentSelector
│       └── OrderConfirmation
```

### Backend-Architektur

```
backend/
├── src/
│   ├── controllers/         # Request Handler (HTTP Layer)
│   │   ├── auth.js          # Authentifizierung
│   │   ├── components.js    # Komponenten-Management
│   │   ├── configurations.js# Konfigurations-Management
│   │   ├── orders.js        # Bestellverwaltung
│   │   ├── payments.js      # Payment-Processing
│   │   ├── ai.js           # KI-Services
│   │   └── admin.js        # Admin-Funktionen
│   ├── middleware/          # Express Middleware
│   │   ├── auth.js         # JWT-Validierung
│   │   ├── validation.js   # Request-Validierung
│   │   ├── rateLimit.js    # Rate Limiting
│   │   ├── upload.js       # File Upload
│   │   └── error.js        # Fehlerbehandlung
│   ├── services/           # Business Logic Layer
│   │   ├── authService.js  # User-Authentifizierung
│   │   ├── componentService.js # Komponenten-Logic
│   │   ├── orderService.js # Bestelllogik
│   │   ├── paymentService.js # Payment-Integration
│   │   ├── aiService.js    # KI-Integration
│   │   ├── emailService.js # E-Mail-Versand
│   │   └── pricingService.js # Preis-Kalkulationen
│   ├── routes/             # API-Routes Definition
│   │   ├── auth.js         # /api/auth/*
│   │   ├── components.js   # /api/components/*
│   │   ├── configurations.js # /api/configurations/*
│   │   ├── orders.js       # /api/orders/*
│   │   ├── payments.js     # /api/payments/*
│   │   ├── ai.js          # /api/ai/*
│   │   └── admin.js       # /api/admin/*
│   ├── models/            # Prisma Models & Custom Types
│   │   ├── User.js        # User-Model Extensions
│   │   ├── Component.js   # Component-Model Extensions
│   │   ├── Order.js       # Order-Model Extensions
│   │   └── types.js       # TypeScript/JSDoc Types
│   ├── utils/             # Utility-Funktionen
│   │   ├── logger.js      # Logging-Utility
│   │   ├── validators.js  # Zod-Schemas
│   │   ├── crypto.js      # Kryptografie-Utilities
│   │   ├── email.js       # E-Mail-Templates
│   │   └── constants.js   # Backend-Konstanten
│   ├── config/            # Konfigurationen
│   │   ├── database.js    # DB-Connection
│   │   ├── redis.js       # Redis-Connection
│   │   ├── stripe.js      # Stripe-Konfiguration
│   │   └── openai.js      # OpenAI-Konfiguration
│   └── index.js           # Application Entry Point
```

---

## Datenbank-Schema

### Entitäten-Beziehungsdiagramm (ERD)

```
Users                    Configurations            Components
┌─────────────────┐     ┌─────────────────┐      ┌─────────────────┐
│ id (UUID)       │─────│ id (UUID)       │      │ id (UUID)       │
│ email           │     │ user_id (FK)    │      │ name            │
│ password_hash   │     │ name            │      │ description     │
│ name            │     │ description     │      │ category        │
│ role            │     │ type            │      │ type            │
│ created_at      │     │ is_public       │      │ specifications  │
│ updated_at      │     │ total_cost      │      │ pricing         │
└─────────────────┘     │ created_at      │      │ availability    │
                        │ updated_at      │      │ created_at      │
                        └─────────────────┘      │ updated_at      │
                                 │               └─────────────────┘
                                 │                        ▲
                                 ▼                        │
                        ConfigurationComponents           │
                        ┌─────────────────┐              │
                        │ id (UUID)       │              │
                        │ config_id (FK)  │──────────────┘
                        │ component_id(FK)│
                        │ quantity        │
                        │ position        │
                        │ custom_margin   │
                        └─────────────────┘
                                 │
                                 ▼
Orders                  OrderItems
┌─────────────────┐     ┌─────────────────┐
│ id (UUID)       │─────│ id (UUID)       │
│ order_number    │     │ order_id (FK)   │
│ user_id (FK)    │     │ component_id(FK)│
│ config_id (FK)  │     │ quantity        │
│ status          │     │ unit_price      │
│ total_amount    │     │ total_price     │
│ payment_status  │     └─────────────────┘
│ shipping_address│
│ created_at      │
│ updated_at      │
└─────────────────┘

Payments                Reviews
┌─────────────────┐     ┌─────────────────┐
│ id (UUID)       │     │ id (UUID)       │
│ order_id (FK)   │     │ user_id (FK)    │
│ method          │     │ component_id(FK)│
│ status          │     │ rating          │
│ amount          │     │ comment         │
│ transaction_id  │     │ created_at      │
│ created_at      │     └─────────────────┘
└─────────────────┘
```

### Prisma-Schema (Auszug)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  passwordHash String  @map("password_hash")
  name        String
  role        UserRole @default(USER)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  configurations Configuration[]
  orders        Order[]
  reviews       Review[]

  @@map("users")
}

model Component {
  id           String                 @id @default(cuid())
  name         String
  description  String
  category     ComponentCategory
  type         String
  specifications Json
  pricing      Json
  availability Json
  createdAt    DateTime              @default(now()) @map("created_at")
  updatedAt    DateTime              @updatedAt @map("updated_at")

  // Relations
  configurationComponents ConfigurationComponent[]
  orderItems             OrderItem[]
  reviews                Review[]

  @@map("components")
}

model Configuration {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  name        String
  description String?
  type        String
  isPublic    Boolean  @default(false) @map("is_public")
  totalCost   Json     @map("total_cost")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user       User                     @relation(fields: [userId], references: [id])
  components ConfigurationComponent[]
  orders     Order[]

  @@map("configurations")
}
```

---

## API-Design-Patterns

### RESTful API-Prinzipien
- **Ressourcen-orientiert**: Jede Entität ist eine Ressource mit eindeutiger URL
- **HTTP-Verben**: GET (lesen), POST (erstellen), PUT (aktualisieren), DELETE (löschen)
- **Statuscode-Semantik**: Konsistente Verwendung von HTTP-Statuscodes
- **JSON-First**: Alle Daten werden als JSON übertragen
- **Versionierung**: API-Versionierung über URL-Pfad (/api/v1/)

### Request/Response-Pattern
```javascript
// Standardisiertes Response-Format
{
  success: boolean,
  data: any,
  message?: string,
  error?: string,
  code?: string,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// Fehlerbehandlung
{
  success: false,
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    field: ["Error message"]
  }
}
```

### Middleware-Pipeline
```
Request
  ▼
CORS
  ▼
Security (Helmet)
  ▼
Rate Limiting
  ▼
Request Logging
  ▼
Body Parsing
  ▼
Authentication (JWT)
  ▼
Authorization
  ▼
Validation (Zod)
  ▼
Controller
  ▼
Service Layer
  ▼
Database (Prisma)
  ▼
Response Formatting
  ▼
Error Handling
  ▼
Response
```

---

## Sicherheitsarchitektur

### Authentifizierung & Autorisierung
```
Client                    Server
  │                        │
  ├─ POST /auth/login ────►│── Validate credentials
  │                        │── Generate JWT token
  │◄─ JWT Token ──────────│── Return token
  │                        │
  ├─ API Request ─────────►│── Extract token
  │   (Authorization:      │── Verify signature
  │    Bearer <token>)     │── Check expiration
  │                        │── Extract user info
  │◄─ Protected Data ─────│── Check permissions
```

### Sicherheitsmaßnahmen
1. **Input-Validation**: Zod-basierte Validierung aller Eingaben
2. **SQL-Injection-Schutz**: Prisma ORM verhindert SQL-Injections
3. **XSS-Schutz**: Helmet.js für Security Headers
4. **CSRF-Schutz**: SameSite Cookies + CSRF-Token
5. **Rate Limiting**: Express-rate-limit für DDoS-Schutz
6. **HTTPS-Enforcement**: SSL/TLS in Produktion
7. **Passwort-Hashing**: bcrypt mit Salt-Rounds
8. **JWT-Security**: Short-lived tokens, secure storage

### Datenschutz (DSGVO)
- **Datenminimierung**: Nur notwendige Daten sammeln
- **Verschlüsselung**: Sensitive Daten verschlüsselt speichern
- **Löschrecht**: User-Daten komplett löschbar
- **Datenportabilität**: Export-Funktion für Benutzerdaten
- **Einwilligungsmanagement**: Cookie-Consent, Privacy Settings

---

## Performance-Architektur

### Frontend-Performance
1. **Code Splitting**: Route-basiertes Lazy Loading
2. **Tree Shaking**: Ungenutzter Code entfernt
3. **Bundle Optimization**: Vite-basierte Optimierung
4. **Image Optimization**: WebP, Lazy Loading, Responsive Images
5. **Service Worker**: Caching-Strategien für offline Nutzung
6. **CDN**: Statische Assets über Vercel Edge Network

### Backend-Performance
1. **Database-Indexing**: Optimierte Indices für häufige Queries
2. **Connection Pooling**: Prisma Connection Pool
3. **Query Optimization**: Prisma Query Batching
4. **Caching**: Redis für Sessions und häufige Daten
5. **Response Compression**: Gzip/Brotli Kompression
6. **Rate Limiting**: Schutz vor Überlastung

### Monitoring & Observability
```
Application Metrics
├── Performance Metrics
│   ├── Response Times
│   ├── Throughput (RPS)
│   ├── Error Rates
│   └── Database Query Times
├── Business Metrics
│   ├── User Registrations
│   ├── Order Conversions
│   ├── Revenue Tracking
│   └── Component Popularity
└── Infrastructure Metrics
    ├── Server Resources (CPU, Memory)
    ├── Database Performance
    ├── External API Response Times
    └── Deployment Success Rate
```

---

## Deployment-Architektur

### CI/CD-Pipeline
```
GitHub Repository
        │
        ▼
GitHub Actions
        │
    ┌───┴───┐
    │       │
    ▼       ▼
Frontend    Backend
  Build     Build
    │         │
    ▼         ▼
  Vercel    Railway
    │         │
    ▼         ▼
  Production Production
```

### Environment-Management
```
Development Environment
├── Local Development (npm run dev)
├── Docker Compose (Services)
├── Environment Variables (.env)
└── Test Database (local PostgreSQL)

Staging Environment
├── Vercel Preview Deployments
├── Railway Staging Service
├── Staging Database
└── Integration Tests

Production Environment
├── Vercel Production (Frontend)
├── Railway Production (Backend)
├── Production Database (Railway PostgreSQL)
├── CDN (Vercel Edge)
├── Monitoring (Railway Analytics)
└── Backup Strategy
```

### Scaling-Strategie
```
Current Architecture (Single Instance)
              Load
                │
                ▼
┌─────────────────────────────┐
│     Single Backend Server   │
│     (Railway Container)     │
└─────────────────────────────┘
                │
                ▼
┌─────────────────────────────┐
│    PostgreSQL Database      │
│    (Railway Managed)        │
└─────────────────────────────┘

Horizontal Scaling (Future)
              Load Balancer
                    │
         ┌─────────┬┴┬─────────┐
         ▼         ▼ ▼         ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Backend    │ │ Backend    │ │ Backend    │
│ Instance 1 │ │ Instance 2 │ │ Instance N │
└────────────┘ └────────────┘ └────────────┘
         │         │               │
         └─────────┼───────────────┘
                   ▼
     ┌─────────────────────────────┐
     │      Database Cluster       │
     │   (Read Replicas, Sharding) │
     └─────────────────────────────┘
```

---

## Integration-Patterns

### Externe Services Integration
```
DIY Humanoid Configurator
            │
            ├── Payment Services
            │   ├── Stripe API (Kreditkarten)
            │   ├── PayPal API (PayPal, SEPA)
            │   └── Webhook Handling
            │
            ├── AI Services
            │   ├── OpenAI GPT (Text Generation)
            │   ├── OpenAI Whisper (Speech-to-Text)
            │   ├── OpenAI TTS (Text-to-Speech)
            │   └── OpenRouter (Alternative LLMs)
            │
            ├── E-Mail Services
            │   ├── SMTP (Transactional Emails)
            │   ├── Template Engine (Handlebars)
            │   └── Newsletter Integration
            │
            └── Analytics & Monitoring
                ├── Google Analytics
                ├── Railway Analytics
                ├── Sentry (Error Tracking)
                └── Custom Metrics
```

### Error Handling & Resilience
```
Error Handling Strategy
├── API Level
│   ├── Try-Catch Blocks
│   ├── Global Error Handler
│   ├── Validation Errors (Zod)
│   └── HTTP Status Codes
├── Service Level
│   ├── Retry Logic (Exponential Backoff)
│   ├── Circuit Breaker Pattern
│   ├── Fallback Responses
│   └── Timeout Handling
├── Database Level
│   ├── Transaction Rollbacks
│   ├── Connection Pool Management
│   ├── Query Timeouts
│   └── Data Consistency Checks
└── Frontend Level
    ├── Error Boundaries (React)
    ├── User-friendly Error Messages
    ├── Offline Support (Service Worker)
    └── Retry Mechanisms
```

---

## Future Architecture Considerations

### Geplante Erweiterungen
1. **Microservices Migration**: Aufspaltung in spezialisierte Services
2. **Event-Driven Architecture**: Message Queues für asynchrone Verarbeitung
3. **Real-time Features**: WebSocket-Integration für Live-Updates
4. **Mobile App**: React Native App mit geteilter Codebasis
5. **AI Enhancement**: Eigene ML-Modelle für bessere Empfehlungen
6. **Internationalization**: Multi-Language-Support
7. **Marketplace Features**: User-Generated Content, Community-Features

### Skalierungs-Herausforderungen
1. **Database Scaling**: Sharding-Strategien für große Datenmengen
2. **File Storage**: Migration zu Cloud Storage (AWS S3, Cloudinary)
3. **Search Functionality**: Elasticsearch für bessere Suchfunktionen
4. **Caching Layer**: Redis Cluster für verbesserte Performance
5. **Global CDN**: Multi-Region-Deployment für internationale Nutzer

Diese Architektur ist darauf ausgelegt, mit dem Wachstum der Anwendung zu skalieren und gleichzeitig Wartbarkeit, Performance und Sicherheit zu gewährleisten.