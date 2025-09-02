#!/bin/bash

# Setup Script für DIY Humanoid Configurator
# Automatisierte Installation und Konfiguration für Linux/macOS

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 DIY Humanoid Configurator - Automatisches Setup${NC}"
echo -e "${GREEN}=========================================${NC}"

# Prüfe Systemvoraussetzungen
echo -e "${YELLOW}🔍 Prüfe Systemvoraussetzungen...${NC}"

# Node.js Version prüfen
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js nicht gefunden. Bitte installiere Node.js von https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="20.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
    echo -e "${GREEN}✅ Node.js v$NODE_VERSION gefunden${NC}"
else
    echo -e "${RED}❌ Node.js Version v$NODE_VERSION ist zu alt. Mindestens v$REQUIRED_VERSION erforderlich.${NC}"
    echo -e "${YELLOW}Bitte installiere Node.js von https://nodejs.org${NC}"
    exit 1
fi

# npm Version prüfen
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm nicht gefunden${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm $NPM_VERSION gefunden${NC}"

# Git prüfen
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git nicht gefunden. Bitte installiere Git${NC}"
    exit 1
fi

GIT_VERSION=$(git --version)
echo -e "${GREEN}✅ $GIT_VERSION gefunden${NC}"

# PostgreSQL prüfen (optional)
HAS_POSTGRES=false
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    echo -e "${GREEN}✅ $PG_VERSION gefunden${NC}"
    HAS_POSTGRES=true
else
    echo -e "${YELLOW}⚠️  PostgreSQL nicht gefunden - verwende Docker oder externe DB${NC}"
fi

# Docker prüfen (optional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ $DOCKER_VERSION gefunden${NC}"
    HAS_DOCKER=true
else
    echo -e "${YELLOW}⚠️  Docker nicht gefunden - für lokale Services empfohlen${NC}"
    HAS_DOCKER=false
fi

echo ""
echo -e "${YELLOW}📦 Installiere Dependencies...${NC}"

# Root Dependencies installieren
if [ -f "package.json" ]; then
    echo "📥 Installiere Root Dependencies..."
    npm install
fi

# Frontend Dependencies installieren
echo "🎨 Installiere Frontend Dependencies..."
cd frontend
npm install

# Playwright installieren
echo "🎭 Installiere Playwright Browser..."
if npx playwright install; then
    echo -e "${GREEN}✅ Playwright installiert${NC}"
else
    echo -e "${YELLOW}⚠️  Playwright Installation teilweise fehlgeschlagen${NC}"
fi

cd ..

# Backend Dependencies installieren
echo "⚙️  Installiere Backend Dependencies..."
cd backend
npm install

# Prisma Client generieren
echo "🔧 Generiere Prisma Client..."
if npm run db:generate; then
    echo -e "${GREEN}✅ Prisma Client generiert${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma Client Generation fehlgeschlagen${NC}"
fi

cd ..

# Environment Dateien erstellen
echo ""
echo -e "${YELLOW}🔧 Erstelle Environment Konfiguration...${NC}"

# Frontend .env erstellen
if [ ! -f "frontend/.env" ]; then
    echo "📝 Erstelle frontend/.env..."
    cat > frontend/.env << 'EOF'
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_APP_ENV=development

# Features
VITE_ENABLE_LLM_ADVISOR=true
VITE_ENABLE_AUDIO_GUIDES=true

# Payment (Testkeys - ersetze mit echten Keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
EOF
fi

# Backend .env erstellen
if [ ! -f "backend/.env" ]; then
    echo "📝 Erstelle backend/.env..."
    cat > backend/.env << 'EOF'
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
EOF
fi

# Root .env.example erstellen
if [ ! -f ".env.example" ]; then
    echo "📝 Erstelle .env.example..."
    cat > .env.example << 'EOF'
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
EOF
fi

# Package.json Scripts hinzufügen (Root)
if [ ! -f "package.json" ]; then
    echo "📝 Erstelle Root package.json..."
    cat > package.json << 'EOF'
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
EOF
    npm install
fi

# Datenbank Setup
if [ "$HAS_POSTGRES" = true ]; then
    echo ""
    echo -e "${YELLOW}🗄️  Datenbank Setup...${NC}"
    
    # Prüfe ob Datenbank existiert
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw humanoid_configurator; then
        echo -e "${GREEN}✅ Datenbank 'humanoid_configurator' existiert bereits${NC}"
    else
        echo "📊 Erstelle Datenbank 'humanoid_configurator'..."
        if sudo -u postgres createdb humanoid_configurator; then
            echo -e "${GREEN}✅ Datenbank erstellt${NC}"
        else
            echo -e "${YELLOW}⚠️  Konnte Datenbank nicht erstellen - bitte manuell erstellen${NC}"
        fi
    fi
    
    # Migrationen ausführen
    echo "🔄 Führe Datenbank-Migrationen aus..."
    cd backend
    if npm run db:push; then
        echo -e "${GREEN}✅ Migrationen abgeschlossen${NC}"
        
        echo "🌱 Lade Seed-Daten..."
        if npm run db:seed; then
            echo -e "${GREEN}✅ Seed-Daten geladen${NC}"
        else
            echo -e "${YELLOW}⚠️  Seed-Daten konnten nicht geladen werden${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Datenbank-Migration fehlgeschlagen${NC}"
    fi
    cd ..
else
    echo ""
    echo -e "${YELLOW}⚠️  PostgreSQL nicht verfügbar - verwende Docker:${NC}"
    echo -e "${CYAN}   docker-compose up -d postgres${NC}"
fi

# Berechtigungen setzen
echo "🔒 Setze Dateiberechtigungen..."
chmod +x setup.sh
[ -f "scripts/build.sh" ] && chmod +x scripts/build.sh
[ -f "scripts/deploy.sh" ] && chmod +x scripts/deploy.sh

echo ""
echo -e "${GREEN}🎉 Setup abgeschlossen!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${CYAN}📋 Nächste Schritte:${NC}"
echo ""
echo -e "${WHITE}1. 🔧 Konfiguration anpassen:${NC}"
echo -e "${BLUE}   - backend/.env (Datenbank, API Keys)${NC}"
echo -e "${BLUE}   - frontend/.env (API URL, Feature Flags)${NC}"
echo ""
echo -e "${WHITE}2. 🚀 Entwicklungsserver starten:${NC}"
echo -e "${CYAN}   npm run dev${NC}"
echo ""
echo -e "${WHITE}3. 🌐 Anwendung öffnen:${NC}"
echo -e "${CYAN}   Frontend: http://localhost:5173${NC}"
echo -e "${CYAN}   Admin:    http://localhost:5174${NC}"
echo -e "${CYAN}   Backend:  http://localhost:3001${NC}"
echo ""
echo -e "${WHITE}4. 🧪 Tests ausführen:${NC}"
echo -e "${CYAN}   npm run test${NC}"
echo -e "${CYAN}   npm run test:e2e${NC}"
echo ""
echo -e "${WHITE}5. 🐳 Docker verwenden (optional):${NC}"
echo -e "${CYAN}   docker-compose up -d${NC}"
echo ""

if [ "$HAS_POSTGRES" = false ]; then
    echo -e "${YELLOW}⚠️  WICHTIG: PostgreSQL Setup erforderlich!${NC}"
    echo -e "${WHITE}Starte PostgreSQL via Docker:${NC}"
    echo -e "${CYAN}docker-compose up -d postgres${NC}"
    echo -e "${CYAN}Dann: npm run db:setup${NC}"
    echo ""
fi

echo -e "${WHITE}📖 Weitere Infos in README.md${NC}"
echo -e "${WHITE}🐛 Issues: https://github.com/username/diy-humanoid-configurator/issues${NC}"
echo ""
echo -e "${GREEN}Viel Spaß beim Entwickeln! 🤖✨${NC}"