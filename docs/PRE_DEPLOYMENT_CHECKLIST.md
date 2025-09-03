# 🚀 Pre-Deployment Checklist - DIY Humanoid Configurator

## Status: ⚠️ DEPLOYMENT VORBEREITUNG

---

## 📋 KRITISCHE VORAUSSETZUNGEN

### ✅ Environment Variablen (OBLIGATORISCH)

#### 🔐 Sicherheit & Auth
- [ ] `JWT_SECRET` - Mindestens 256-bit zufälliger String generiert
- [ ] `STRIPE_SECRET_KEY` - Live Stripe Secret Key eingetragen
- [ ] `STRIPE_PUBLISHABLE_KEY` - Live Stripe Publishable Key eingetragen  
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe Webhook Secret konfiguriert
- [ ] `OPENAI_API_KEY` - OpenAI API Key für LLM Advisor

#### 🗄️ Database
- [ ] `DATABASE_URL` - PostgreSQL Verbindung (Supabase/Railway) getestet
- [ ] Database Migrations ausgeführt
- [ ] Database Seed-Daten für Production bereit
- [ ] Database Backups konfiguriert

#### 📧 Email
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - E-Mail Provider konfiguriert
- [ ] `FROM_EMAIL`, `FROM_NAME` - Absender-Details eingetragen
- [ ] Test-E-Mails versendet und empfangen

#### 🌐 CORS & URLs
- [ ] `CORS_ORIGIN` - Korrekte Frontend-URL eingetragen
- [ ] `VITE_API_URL` - Korrekte Backend-URL in Frontend konfiguriert
- [ ] Domain-Konfiguration abgeschlossen

---

## 🔧 TECHNISCHE TESTS

### ✅ Backend Tests
- [ ] **API Health Check funktioniert**
  ```bash
  curl https://your-backend.railway.app/api/health
  # Sollte {"status": "ok", "timestamp": "..."} zurückgeben
  ```

- [ ] **Database Verbindung erfolgreich**
  ```bash
  # In Railway Console:
  cd backend && npm run db:studio
  ```

- [ ] **Authentication Endpoints testen**
  ```bash
  # POST /api/auth/register
  # POST /api/auth/login  
  # GET /api/auth/profile (mit JWT)
  ```

- [ ] **Payment Endpoints funktional**
  ```bash
  # POST /api/payment/stripe/create-intent
  # POST /api/webhooks/stripe (Webhook-Test)
  ```

### ✅ Frontend Tests  
- [ ] **Build erfolgreich**
  ```bash
  cd frontend && npm run build
  # Sollte ohne Fehler kompilieren
  ```

- [ ] **Environment Variablen geladen**
  - VITE_API_URL korrekt
  - VITE_STRIPE_PUBLISHABLE_KEY korrekt
  - VITE_APP_ENV=production

- [ ] **Frontend-Backend Kommunikation**
  - Login funktioniert
  - API-Calls erfolgreich
  - CORS richtig konfiguriert

---

## 🎯 HOSTING PLATTFORMEN

### ✅ Vercel (Frontend)
- [ ] **Projekt erstellt** - `vercel link` ausgeführt
- [ ] **Environment Variables gesetzt**:
  ```
  VITE_API_URL=https://your-backend.railway.app/api
  VITE_APP_ENV=production
  VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
  VITE_ENABLE_LLM_ADVISOR=true
  VITE_ENABLE_AUDIO_GUIDES=true
  VITE_SENTRY_DSN=https://...
  ```
- [ ] **Build Command konfiguriert**: `npm run build:frontend`
- [ ] **Output Directory**: `frontend/dist`
- [ ] **Domain konfiguriert** (optional)

### ✅ Railway (Backend)
- [ ] **Projekt erstellt und Repository verlinkt**
- [ ] **PostgreSQL Service hinzugefügt**
- [ ] **Redis Service hinzugefügt** (optional)
- [ ] **Environment Variables gesetzt** (siehe production.env.template)
- [ ] **Health Check funktioniert**: `/api/health`
- [ ] **Custom Domain** konfiguriert (optional)

---

## 🔍 SICHERHEITSPRÜFUNGEN

### ✅ API Sicherheit
- [ ] **Rate Limiting aktiviert**
- [ ] **CORS richtig konfiguriert** (nicht auf `*` in Production)
- [ ] **Helmet Security Headers** aktiviert
- [ ] **Input Validation** mit Zod implementiert
- [ ] **SQL Injection Schutz** durch Prisma ORM
- [ ] **XSS Protection** aktiviert

### ✅ Authentication Security
- [ ] **JWT Secrets rotiert** (unterschiedlich zu Development)
- [ ] **Password Hashing** mit bcrypt (mindestens 12 rounds)
- [ ] **Session Management** korrekt implementiert
- [ ] **HTTPS erzwungen** in Production

### ✅ Payment Security
- [ ] **Stripe Webhook Signatur-Validierung** implementiert
- [ ] **Sensitive Payment Daten** niemals in Logs
- [ ] **PCI-DSS Compliance** durch Stripe Elements gewährleistet

---

## 📊 MONITORING & LOGGING

### ✅ Error Tracking
- [ ] **Sentry konfiguriert** für Frontend & Backend
- [ ] **Error DSNs** in Environment Variables eingetragen
- [ ] **Source Maps** hochgeladen für bessere Stack Traces
- [ ] **Test-Fehler** versendet um Sentry zu testen

### ✅ Performance Monitoring  
- [ ] **Application Performance Monitoring** (APM) aktiviert
- [ ] **Database Query Monitoring** konfiguriert
- [ ] **API Response Time Tracking** implementiert

### ✅ Uptime Monitoring
- [ ] **UptimeRobot** oder ähnlicher Service konfiguriert
- [ ] **Health Check Endpoints** überwacht
- [ ] **Alert-Benachrichtigungen** eingerichtet

### ✅ Logging
- [ ] **Structured Logging** implementiert
- [ ] **Log Levels** korrekt konfiguriert (info für Production)
- [ ] **Log Rotation** eingerichtet
- [ ] **Sensitive Daten** aus Logs ausgeschlossen

---

## 🚀 DEPLOYMENT STRATEGIE

### ✅ Staging Environment
- [ ] **Staging-Branch** erstellt (`staging`)
- [ ] **Staging Deployment** funktioniert
- [ ] **Staging URLs** konfiguriert
- [ ] **E2E Tests** im Staging erfolgreich

### ✅ Production Deployment
- [ ] **Production Branch** bereit (`main`)
- [ ] **Git Tags** für Versionierung vorbereitet
- [ ] **Rollback-Plan** definiert
- [ ] **Maintenance Page** vorbereitet (falls nötig)

### ✅ CI/CD Pipeline
- [ ] **GitHub Actions** konfiguriert (optional)
- [ ] **Automated Testing** vor Deployment
- [ ] **Deployment Notifications** eingerichtet
- [ ] **Post-Deployment Health Checks** automatisiert

---

## 🔄 DATENBANK MIGRATION & SEEDS

### ✅ Production Database Setup
- [ ] **Database created** in Railway/Supabase
- [ ] **Prisma Migrations** ausgeführt:
  ```bash
  cd backend && npm run db:migrate
  ```
- [ ] **Production Seed Daten** eingespielt:
  ```bash
  cd backend && npm run db:seed
  ```
- [ ] **Database Backup** vor Go-Live erstellt
- [ ] **Database Performance** optimiert (Indexe, etc.)

---

## 🎭 FEATURE FLAGS

### ✅ Production Features
- [ ] `FEATURE_USER_REGISTRATION=true`
- [ ] `FEATURE_GUEST_CHECKOUT=true`  
- [ ] `FEATURE_ADMIN_PANEL=true`
- [ ] `FEATURE_ORDER_TRACKING=true`
- [ ] `FEATURE_3D_PREVIEW=true`
- [ ] `FEATURE_PAYMENT_INSTALLMENTS=false` (später aktivieren)

---

## ⚠️ BEKANNTE PROBLEME

### 🔧 Test-Probleme (zu beheben vor Deployment)
1. **Frontend Unit Tests** - Component Import Fehler
   - Status: ⚠️ Tests schlagen fehl
   - Lösung: Component Imports reparieren
   - Kritikalität: Mittel (blockiert nicht Deployment)

2. **Backend Jest Configuration** - Babel ECMAScript Module Fehler
   - Status: ⚠️ Tests schlagen fehl  
   - Lösung: Jest Konfiguration für ES Modules anpassen
   - Kritikalität: Mittel (blockiert nicht Deployment)

3. **postinstall Loop** - Endlosschleife in npm install
   - Status: ✅ Behoben durch package.json Anpassung
   - Kritikalität: Hoch (war deployment-blockierend)

---

## 📞 SUPPORT & NOTFALL

### ✅ Notfall-Kontakte
- [ ] **Technical Lead** Kontaktdaten eingetragen
- [ ] **Hosting Support** (Vercel/Railway) Zugangsdaten verfügbar
- [ ] **Database Admin** Zugangsdaten gesichert
- [ ] **Payment Provider Support** Kontakte verfügbar

### ✅ Dokumentation
- [ ] **API Dokumentation** aktualisiert
- [ ] **Deployment Runbooks** erstellt
- [ ] **Rollback Procedures** dokumentiert
- [ ] **Troubleshooting Guide** verfügbar

---

## 🎯 GO/NO-GO ENTSCHEIDUNG

### ✅ GO-Kriterien (ALLE müssen erfüllt sein)
- [ ] Alle kritischen Environment Variables konfiguriert
- [ ] Database Verbindung erfolgreich getestet
- [ ] Payment Integration funktioniert  
- [ ] Frontend-Backend Kommunikation erfolgreich
- [ ] Sicherheitsmaßnahmen implementiert
- [ ] Monitoring und Logging aktiv
- [ ] Rollback-Plan vorhanden

### ⚠️ NICE-TO-HAVE (nicht deployment-blockierend)
- [ ] Unit Tests komplett grün
- [ ] E2E Tests vollständig
- [ ] Performance Optimierungen
- [ ] Advanced Monitoring Features
- [ ] Custom Domain Setup

---

## 📊 DEPLOYMENT READINESS SCORE

**Aktueller Status: 60% bereit** ⚠️

### ✅ Bereit (60%):
- Build-Prozess funktioniert
- Docker-Container konfiguriert
- Environment Templates erstellt
- Vercel/Railway Konfiguration vorbereitet
- Sicherheits-Headers konfiguriert
- Database Schema bereit

### ⚠️ In Arbeit (40%):
- Environment Variables setzen
- Database Migration ausführen
- Payment Provider testen
- Monitoring einrichten
- SSL/Domain konfigurieren
- Production Tests durchführen

---

**EMPFEHLUNG: Staging Deployment zuerst, dann Production nach vollständiger Checklisten-Abarbeitung** ⚠️