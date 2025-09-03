# 🚀 Deployment Guide - DIY Humanoid Configurator

## Übersicht
Komplette Anleitung für das Production Deployment auf Vercel (Frontend) und Railway (Backend).

---

## 📋 VORAUSSETZUNGEN

### Accounts & Services
- [x] **GitHub Account** mit Repository Zugriff
- [ ] **Vercel Account** (vercel.com)
- [ ] **Railway Account** (railway.app)
- [ ] **Supabase Account** (supabase.com) oder Railway PostgreSQL
- [ ] **Stripe Account** (stripe.com) mit Live-Keys
- [ ] **OpenAI Account** (openai.com) für LLM Features
- [ ] **Email Provider** (SendGrid, Mailgun, etc.)
- [ ] **Sentry Account** (sentry.io) für Error Tracking

### Tools
- [x] Node.js >= 20.0.0
- [x] npm >= 10.0.0
- [x] Git
- [ ] Vercel CLI: `npm i -g vercel`
- [ ] Railway CLI: `npm i -g @railway/cli`

---

## 🎯 DEPLOYMENT ARCHITEKTUR

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Supabase      │
│   (Frontend)    │◄───┤   (Backend)     │◄───┤   (Database)    │
│                 │    │                 │    │                 │
│ • React/Vite    │    │ • Node.js/Express│    │ • PostgreSQL    │
│ • Static Files  │    │ • API Endpoints │    │ • Real-time     │
│ • CDN Global    │    │ • Authentication│    │ • Backups       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   External      │
                    │   Services      │
                    │                 │
                    │ • Stripe        │
                    │ • OpenAI        │
                    │ • SendGrid      │
                    │ • Sentry        │
                    └─────────────────┘
```

---

## 1️⃣ BACKEND DEPLOYMENT (Railway)

### Schritt 1: Railway Projekt erstellen

```bash
# Railway CLI installieren
npm install -g @railway/cli

# In Railway einloggen
railway login

# Neues Projekt erstellen
railway init

# Repository verlinken
railway link
```

### Schritt 2: PostgreSQL Service hinzufügen

```bash
# PostgreSQL Service hinzufügen
railway add postgresql

# Database URL kopieren
railway variables
```

**Alternative: Supabase verwenden**
```bash
# Bei Supabase Projekt erstellen und DATABASE_URL kopieren
# Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

### Schritt 3: Environment Variables setzen

```bash
# Kritische Variablen setzen
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="your-super-secure-256-bit-secret-here"
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway variables set OPENAI_API_KEY="sk-..."
railway variables set CORS_ORIGIN="https://your-app.vercel.app"

# Email Configuration
railway variables set SMTP_HOST="smtp.sendgrid.net"
railway variables set SMTP_PORT="587"
railway variables set SMTP_USER="apikey" 
railway variables set SMTP_PASS="your-sendgrid-api-key"
railway variables set FROM_EMAIL="noreply@your-domain.com"

# Monitoring
railway variables set SENTRY_DSN="https://...@sentry.io/..."
railway variables set LOG_LEVEL="info"
```

### Schritt 4: Database Migration

```bash
# Prisma Migration ausführen
railway run --service backend npm run db:generate
railway run --service backend npm run db:migrate

# Seed Daten einspielen (optional)
railway run --service backend npm run db:seed
```

### Schritt 5: Deployment konfigurieren

```bash
# railway.toml bereits konfiguriert, jetzt deployen
railway up

# Service URL kopieren
railway status
# Beispiel: https://diy-humanoid-configurator-backend-production.up.railway.app
```

### Schritt 6: Health Check testen

```bash
curl https://your-backend-url.railway.app/api/health
# Erwartete Antwort: {"status":"ok","timestamp":"..."}
```

---

## 2️⃣ FRONTEND DEPLOYMENT (Vercel)

### Schritt 1: Vercel Projekt erstellen

```bash
# Vercel CLI installieren
npm install -g vercel

# In Vercel einloggen
vercel login

# Projekt initialisieren
vercel

# Vercel Konfiguration
# Framework: Other
# Root Directory: ./
# Build Command: npm run build:frontend
# Output Directory: frontend/dist
```

### Schritt 2: Environment Variables setzen

**Via Vercel Dashboard (vercel.com/dashboard):**

```bash
# In Vercel Dashboard → Project Settings → Environment Variables

VITE_API_URL=https://your-backend.railway.app/api
VITE_APP_ENV=production
VITE_APP_VERSION=0.7.0
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_ENABLE_LLM_ADVISOR=true
VITE_ENABLE_AUDIO_GUIDES=true
VITE_SENTRY_DSN=https://...@sentry.io/...
```

**Via CLI:**
```bash
vercel env add VITE_API_URL production
# Eingabe: https://your-backend.railway.app/api

vercel env add VITE_APP_ENV production  
# Eingabe: production

vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Eingabe: pk_live_...
```

### Schritt 3: Deployment

```bash
# Production Deployment
vercel --prod

# URL kopieren
# Beispiel: https://diy-humanoid-configurator.vercel.app
```

### Schritt 4: Domain konfigurieren (Optional)

```bash
# Custom Domain hinzufügen
vercel domains add your-domain.com

# DNS Konfiguration in Domain-Provider:
# A Record: @ → 76.76.19.61 (Vercel IP)
# CNAME Record: www → cname.vercel-dns.com
```

---

## 3️⃣ SSL & SECURITY SETUP

### SSL Zertifikate
- **Vercel**: Automatische SSL-Zertifikate (Let's Encrypt)
- **Railway**: Automatische SSL für *.up.railway.app URLs
- **Custom Domain**: Automatisch via Vercel/Railway

### Security Headers (bereits konfiguriert)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

---

## 4️⃣ MONITORING & LOGGING SETUP

### Sentry Error Tracking

```bash
# Sentry Projekt erstellen (sentry.io)
# 1. Neues Projekt: Node.js (Backend) + React (Frontend)
# 2. DSN URLs kopieren

# Backend: Railway
railway variables set SENTRY_DSN="https://...@o123.ingest.sentry.io/..."
railway variables set SENTRY_ENVIRONMENT="production"

# Frontend: Vercel
vercel env add VITE_SENTRY_DSN production
# Eingabe: https://...@o123.ingest.sentry.io/...
```

### Uptime Monitoring

```bash
# UptimeRobot (uptimerobot.com) konfigurieren
# Monitor Type: HTTP(s)
# URL: https://your-backend.railway.app/api/health
# Interval: 5 minutes
# Alert Contacts: E-Mail einrichten
```

### Performance Monitoring

```bash
# Vercel Analytics aktivieren
vercel --prod
# Im Dashboard: Analytics Tab aktivieren

# Railway Metrics
railway metrics
```

---

## 5️⃣ DATENBANK SETUP

### PostgreSQL (Railway)

```bash
# Database URL aus Railway Dashboard kopieren
railway variables

# Connection testen
railway run --service postgresql psql $DATABASE_URL
```

### PostgreSQL (Supabase)

```bash
# 1. Supabase Projekt erstellen (supabase.com)
# 2. Settings → Database → Connection String kopieren
# 3. In Railway als DATABASE_URL setzen

railway variables set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
```

### Database Migration & Seeding

```bash
# Schema erstellen
railway run --service backend npm run db:generate
railway run --service backend npm run db:migrate

# Production Daten einspielen
railway run --service backend npm run db:seed

# Database Studio (Development only)
railway run --service backend npm run db:studio
```

---

## 6️⃣ PAYMENT INTEGRATION

### Stripe Live-Keys konfigurieren

```bash
# 1. Stripe Dashboard (dashboard.stripe.com)
# 2. Developers → API Keys → Live Keys kopieren
# 3. Webhooks → Add endpoint

# Backend (Railway)
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Webhook URL: https://your-backend.railway.app/api/webhooks/stripe
# Events: payment_intent.succeeded, customer.subscription.created
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."

# Frontend (Vercel)
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Eingabe: pk_live_...
```

### Payment Testing

```bash
# Test Webhook
curl -X POST https://your-backend.railway.app/api/webhooks/stripe \
  -H "Stripe-Signature: t=..." \
  -d '{"id": "evt_test_webhook"}'

# Test Payment Intent
curl -X POST https://your-backend.railway.app/api/payment/stripe/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 1000, "currency": "eur"}'
```

---

## 7️⃣ CI/CD PIPELINE (Optional)

### GitHub Actions Setup

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm run test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railway/cli@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
      - run: railway up --service backend

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

---

## 8️⃣ LAUNCH SCRIPTS

### deploy-frontend.ps1

```powershell
#!/usr/bin/env pwsh
# deploy-frontend.ps1

Write-Host "🚀 Deploying Frontend to Vercel..." -ForegroundColor Blue

# Build Frontend
Write-Host "📦 Building Frontend..." -ForegroundColor Yellow
cd frontend
npm ci
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Yellow
cd ..
vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    Write-Host "🔗 URL: https://diy-humanoid-configurator.vercel.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
```

### deploy-backend.ps1

```powershell
#!/usr/bin/env pwsh
# deploy-backend.ps1

Write-Host "🚀 Deploying Backend to Railway..." -ForegroundColor Blue

# Test Database Connection
Write-Host "🗄️ Testing Database Connection..." -ForegroundColor Yellow
railway run --service backend npm run db:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Railway
Write-Host "🚂 Deploying to Railway..." -ForegroundColor Yellow
railway up --service backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
    
    # Health Check
    Write-Host "🏥 Running Health Check..." -ForegroundColor Yellow
    $healthUrl = railway status --service backend --json | ConvertFrom-Json | Select-Object -ExpandProperty url
    $healthUrl += "/api/health"
    
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get
        Write-Host "✅ Health Check passed: $($response.status)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Health Check failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
```

### rollback.ps1

```powershell
#!/usr/bin/env pwsh
# rollback.ps1

param(
    [string]$Service = "both",
    [string]$Version = "previous"
)

Write-Host "🔄 Rolling back $Service..." -ForegroundColor Yellow

switch ($Service) {
    "frontend" {
        Write-Host "⏪ Rolling back Frontend..." -ForegroundColor Blue
        vercel rollback
    }
    "backend" {
        Write-Host "⏪ Rolling back Backend..." -ForegroundColor Blue
        railway rollback --service backend
    }
    "both" {
        Write-Host "⏪ Rolling back both services..." -ForegroundColor Blue
        railway rollback --service backend
        vercel rollback
    }
}

Write-Host "✅ Rollback completed!" -ForegroundColor Green
```

---

## 9️⃣ POST-DEPLOYMENT CHECKS

### Health Checks

```bash
# Backend Health Check
curl https://your-backend.railway.app/api/health
# Expected: {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}

# Frontend Check
curl https://your-app.vercel.app/
# Expected: HTML content with <title>DIY Humanoid Configurator</title>

# Database Check
curl https://your-backend.railway.app/api/admin/stats
# Expected: {"users": 0, "orders": 0, "products": X}
```

### API Tests

```bash
# Authentication Test
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'

# Payment Test (with Stripe Test Mode)
curl -X POST https://your-backend.railway.app/api/payment/stripe/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount":1000,"currency":"eur"}'
```

### Performance Tests

```bash
# Load Time Test
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app/

# Create curl-format.txt:
echo "
     time_namelookup:  %{time_namelookup}
        time_connect:  %{time_connect}
     time_appconnect:  %{time_appconnect}
    time_pretransfer:  %{time_pretransfer}
       time_redirect:  %{time_redirect}
  time_starttransfer:  %{time_starttransfer}
                     ----------
          time_total:  %{time_total}
" > curl-format.txt
```

---

## 🔧 TROUBLESHOOTING

### Häufige Probleme

#### 1. "Module not found" Fehler
```bash
# Lösung: Dependencies neu installieren
railway run --service backend npm ci
vercel --prod
```

#### 2. CORS Fehler
```bash
# Backend CORS_ORIGIN prüfen
railway variables | grep CORS_ORIGIN
# Sollte: https://your-app.vercel.app (ohne trailing slash)

# Korrekt setzen
railway variables set CORS_ORIGIN="https://your-app.vercel.app"
```

#### 3. Database Connection Failed
```bash
# DATABASE_URL prüfen
railway variables | grep DATABASE_URL

# Migration neu ausführen
railway run --service backend npm run db:migrate
```

#### 4. Payment Webhook Failures
```bash
# Webhook URL in Stripe Dashboard prüfen
# Sollte: https://your-backend.railway.app/api/webhooks/stripe

# Webhook Secret prüfen
railway variables | grep STRIPE_WEBHOOK_SECRET
```

#### 5. Build Failures
```bash
# Node.js Version prüfen (sollte >= 20.0.0)
railway run --service backend node --version

# Dependencies Cache clearen
railway run --service backend npm cache clean --force
railway run --service backend npm ci
```

### Log Debugging

```bash
# Railway Logs
railway logs --service backend

# Vercel Logs
vercel logs

# Database Logs (Railway)
railway logs --service postgresql
```

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment ✅
- [ ] Alle Environment Variables konfiguriert
- [ ] Database Migration erfolgreich
- [ ] Payment Integration getestet
- [ ] SSL Zertifikate aktiv
- [ ] Monitoring konfiguriert

### Deployment ✅
- [ ] Backend deployed und Health Check grün
- [ ] Frontend deployed und erreichbar
- [ ] Database Seeds eingespielt
- [ ] DNS konfiguriert (falls Custom Domain)

### Post-Deployment ✅
- [ ] Alle API Endpoints funktional
- [ ] Payment Flow getestet
- [ ] Error Tracking aktiv
- [ ] Performance Monitoring läuft
- [ ] Backup-Strategie implementiert

---

## 📞 SUPPORT KONTAKTE

### Hosting Provider Support
- **Vercel**: support@vercel.com
- **Railway**: team@railway.app  
- **Supabase**: support@supabase.io

### Payment Provider Support
- **Stripe**: support@stripe.com
- **PayPal**: developer-support@paypal.com

### Monitoring Support
- **Sentry**: support@sentry.io
- **UptimeRobot**: support@uptimerobot.com

---

**🎉 Deployment erfolgreich! Deine App läuft jetzt in Production.**

**Frontend**: https://your-app.vercel.app  
**Backend**: https://your-backend.railway.app  
**Admin**: https://your-app.vercel.app/admin