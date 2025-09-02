# PowerShell Setup Script für DIY Humanoid Configurator
# Automatisierte Installation und Konfiguration für Windows

Write-Host "🤖 DIY Humanoid Configurator - Automatisches Setup" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Prüfe Systemvoraussetzungen
Write-Host "🔍 Prüfe Systemvoraussetzungen..." -ForegroundColor Yellow

# Node.js Version prüfen
try {
    $nodeVersion = node --version
    $nodeVersionNumber = [System.Version]($nodeVersion -replace "v", "")
    $requiredVersion = [System.Version]"20.0.0"
    
    if ($nodeVersionNumber -ge $requiredVersion) {
        Write-Host "✅ Node.js $nodeVersion gefunden" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js Version $nodeVersion ist zu alt. Mindestens v20.0.0 erforderlich." -ForegroundColor Red
        Write-Host "Bitte installiere Node.js von https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Node.js nicht gefunden. Bitte installiere Node.js von https://nodejs.org" -ForegroundColor Red
    exit 1
}

# npm Version prüfen
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion gefunden" -ForegroundColor Green
} catch {
    Write-Host "❌ npm nicht gefunden" -ForegroundColor Red
    exit 1
}

# Git prüfen
try {
    $gitVersion = git --version
    Write-Host "✅ $gitVersion gefunden" -ForegroundColor Green
} catch {
    Write-Host "❌ Git nicht gefunden. Bitte installiere Git von https://git-scm.com" -ForegroundColor Red
    exit 1
}

# PostgreSQL prüfen (optional)
try {
    $pgVersion = psql --version
    Write-Host "✅ $pgVersion gefunden" -ForegroundColor Green
    $hasPostgres = $true
} catch {
    Write-Host "⚠️  PostgreSQL nicht gefunden - verwende Docker oder externe DB" -ForegroundColor Yellow
    $hasPostgres = $false
}

Write-Host "`n📦 Installiere Dependencies..." -ForegroundColor Yellow

# Root Dependencies installieren
if (Test-Path "package.json") {
    Write-Host "📥 Installiere Root Dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Root Dependencies Installation fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
}

# Frontend Dependencies installieren
Write-Host "🎨 Installiere Frontend Dependencies..."
Push-Location frontend
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend Dependencies Installation fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    
    # Playwright installieren
    Write-Host "🎭 Installiere Playwright Browser..."
    npx playwright install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Playwright Installation teilweise fehlgeschlagen" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Backend Dependencies installieren
Write-Host "⚙️  Installiere Backend Dependencies..."
Push-Location backend
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend Dependencies Installation fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔧 Generiere Prisma Client..."
    npm run db:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Prisma Client Generation fehlgeschlagen" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Environment Dateien erstellen
Write-Host "`n🔧 Erstelle Environment Konfiguration..." -ForegroundColor Yellow

# Frontend .env erstellen
if (!(Test-Path "frontend/.env")) {
    Write-Host "📝 Erstelle frontend/.env..."
    @"
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_APP_ENV=development

# Features
VITE_ENABLE_LLM_ADVISOR=true
VITE_ENABLE_AUDIO_GUIDES=true

# Payment (Testkeys - ersetze mit echten Keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
"@ | Out-File -FilePath "frontend/.env" -Encoding UTF8
}

# Backend .env erstellen
if (!(Test-Path "backend/.env")) {
    Write-Host "📝 Erstelle backend/.env..."
    @"
# Server Configuration
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/humanoid_configurator"

# Authentication
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Payment (Testkeys - ersetze mit echten Keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here

# AI Services (optional - für KI-Berater)
OPENAI_API_KEY=sk-your_openai_key_here
OPENROUTER_API_KEY=sk-or-your_openrouter_key_here

# Email (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test@example.com
SMTP_PASS=password

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
"@ | Out-File -FilePath "backend/.env" -Encoding UTF8
}

# Root .env.example erstellen
if (!(Test-Path ".env.example")) {
    Write-Host "📝 Erstelle .env.example..."
    @"
# Environment Beispiel-Datei
# Kopiere diese Datei zu .env und fülle die Werte aus

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/humanoid_configurator"

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

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
"@ | Out-File -FilePath ".env.example" -Encoding UTF8
}

# Datenbank Setup
if ($hasPostgres) {
    Write-Host "`n🗄️  Datenbank Setup..." -ForegroundColor Yellow
    
    $dbExists = $false
    try {
        # Prüfe ob Datenbank existiert
        $checkDb = psql -U postgres -lqt | Select-String "humanoid_configurator"
        if ($checkDb) {
            $dbExists = $true
            Write-Host "✅ Datenbank 'humanoid_configurator' existiert bereits" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Konnte Datenbank-Status nicht prüfen" -ForegroundColor Yellow
    }
    
    if (!$dbExists) {
        try {
            Write-Host "📊 Erstelle Datenbank 'humanoid_configurator'..."
            createdb -U postgres humanoid_configurator
            Write-Host "✅ Datenbank erstellt" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Konnte Datenbank nicht erstellen - bitte manuell erstellen" -ForegroundColor Yellow
        }
    }
    
    # Migrationen ausführen
    Push-Location backend
    try {
        Write-Host "🔄 Führe Datenbank-Migrationen aus..."
        npm run db:push
        
        Write-Host "🌱 Lade Seed-Daten..."
        npm run db:seed
        
        Write-Host "✅ Datenbank Setup abgeschlossen" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Datenbank-Migration teilweise fehlgeschlagen" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⚠️  PostgreSQL nicht verfügbar - verwende Docker:" -ForegroundColor Yellow
    Write-Host "   docker-compose up -d postgres" -ForegroundColor Cyan
}

# Package.json Scripts hinzufügen (Root)
if (!(Test-Path "package.json")) {
    Write-Host "📝 Erstelle Root package.json..."
    @"
{
  "name": "diy-humanoid-configurator",
  "version": "0.7.0",
  "private": true,
  "description": "DIY Humanoid Robot Configurator with AI Advisor",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "start": "cd backend && npm start",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm run test",
    "test:backend": "cd backend && npm run test",
    "test:e2e": "cd frontend && npm run test:e2e",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "cd frontend && npm run lint",
    "lint:backend": "cd backend && npm run lint",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install",
    "db:setup": "cd backend && npm run db:migrate && npm run db:seed",
    "db:reset": "cd backend && npm run db:reset",
    "db:studio": "cd backend && npm run db:studio",
    "docker:dev": "docker-compose up -d",
    "docker:prod": "docker-compose -f docker-compose.prod.yml up -d",
    "docker:down": "docker-compose down"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
"@ | Out-File -FilePath "package.json" -Encoding UTF8

    npm install
}

Write-Host "`n🎉 Setup abgeschlossen!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Nächste Schritte:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔧 Konfiguration anpassen:" -ForegroundColor White
Write-Host "   - backend/.env (Datenbank, API Keys)" -ForegroundColor Gray
Write-Host "   - frontend/.env (API URL, Feature Flags)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🚀 Entwicklungsserver starten:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. 🌐 Anwendung öffnen:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Admin:    http://localhost:5174" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. 🧪 Tests ausführen:" -ForegroundColor White
Write-Host "   npm run test" -ForegroundColor Cyan
Write-Host "   npm run test:e2e" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. 🐳 Docker verwenden (optional):" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Cyan
Write-Host ""

if (!$hasPostgres) {
    Write-Host "⚠️  WICHTIG: PostgreSQL Setup erforderlich!" -ForegroundColor Yellow
    Write-Host "Starte PostgreSQL via Docker:" -ForegroundColor White
    Write-Host "docker-compose up -d postgres" -ForegroundColor Cyan
    Write-Host "Dann: npm run db:setup" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "📖 Weitere Infos in README.md" -ForegroundColor White
Write-Host "🐛 Issues: https://github.com/username/diy-humanoid-configurator/issues" -ForegroundColor White
Write-Host ""
Write-Host "Viel Spaß beim Entwickeln! 🤖✨" -ForegroundColor Green