# DIY Humanoid Configurator - Authentifikations-System Setup

## Überblick

Das DIY Humanoid Configurator Projekt verfügt jetzt über ein vollständiges Authentifikations-System mit folgenden Features:

### 🔐 Sicherheits-Features
- **JWT-basierte Authentifikation** mit Refresh Token Rotation
- **Bcrypt Password Hashing** (12 Rounds)  
- **Role-based Access Control** (Customer, Support, Admin)
- **Email-Verifikation** mit Token-System
- **Password Reset** mit sicheren Tokens
- **Rate Limiting** für Login-Versuche
- **Account Lockout** nach 5 fehlgeschlagenen Versuchen
- **Audit Logging** aller Admin-Aktionen
- **CSRF Protection** und XSS Prevention
- **2FA-Vorbereitung** (TOTP Ready)

### 📧 Email-Integration
- **Willkommens-Emails** mit Verifikationslink
- **Password-Reset-Emails** mit sicheren Tokens
- **Login-Benachrichtigungen** für Sicherheit
- **Template-basierte HTML-Emails** (Deutsch)
- **SMTP-Integration** (Gmail, Custom SMTP)

### 🎯 Frontend-Komponenten
- **LoginForm** mit Validierung und Loading States
- **RegisterForm** mit Password-Stärke-Indikator
- **ProtectedRoute** für Zugriffskontrolle
- **UserMenu** mit Rollenverwaltung
- **AuthProvider** mit Token-Management
- **Automatischer Token-Refresh**

## 🚀 Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Dependencies installieren (falls nicht schon geschehen)
npm install

# Database Schema anwenden
# Option A: Mit laufender PostgreSQL-Datenbank
npx prisma migrate dev --name "add-auth-system"

# Option B: Manuell mit SQL-Script (wenn DB nicht erreichbar)
# Führe migrations/001_add_auth_system.sql in deiner PostgreSQL-Datenbank aus
psql -d diy_humanoid -f migrations/001_add_auth_system.sql

# Prisma Client generieren
npx prisma generate
```

### 2. Environment Variablen

Erweitere deine `.env` Datei im Backend:

```env
# Bestehende Konfiguration...
DATABASE_URL=postgres://username:password@localhost:5432/diy_humanoid

# Auth & Security (NEU/AKTUALISIERT)
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars-long-very-secure-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (NEU)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@diy-humanoid-configurator.com

# Frontend URL für Email-Links (NEU)
FRONTEND_URL=http://localhost:3000

# Cookie & Session Security (NEU)
COOKIE_SECRET=your-super-secret-cookie-key-here-min-32-chars
COOKIE_SECURE=false  # true für Production
COOKIE_SAME_SITE=lax
```

### 3. Gmail App Password Setup (für Email)

1. Gehe zu [Google Account Settings](https://myaccount.google.com/)
2. Aktiviere 2-Step Verification
3. Gehe zu "App passwords" 
4. Generiere ein App Password für "Mail"
5. Nutze dieses Password als `EMAIL_PASS`

### 4. Frontend Setup

```bash
cd frontend

# Dependencies sind bereits installiert
# Keine zusätzlichen Abhängigkeiten nötig - alles ist React-basiert
```

### 5. Email-Service testen

```bash
cd backend

# Basis-Konfiguration prüfen
node scripts/test-email.js --config-check

# Test-Emails senden
TEST_EMAIL=your-test@email.com node scripts/test-email.js
```

## 📊 Database Schema

### Neue Tabellen

```sql
-- Erweiterte User-Tabelle
users (
  + emailVerified BOOLEAN
  + emailVerifiedAt TIMESTAMP
  + password TEXT
  + isTwoFactorEnabled BOOLEAN  
  + twoFactorSecret TEXT
  + loginAttempts INTEGER
  + lockedUntil TIMESTAMP
)

-- Auth-System Tabellen
refresh_tokens (id, token, userId, expiresAt, isRevoked)
password_resets (id, email, token, userId, expiresAt, used)
email_verifications (id, email, token, userId, expiresAt, used)
login_attempts (id, email, ipAddress, userAgent, success, createdAt)
```

### Standard Admin User

Das System erstellt automatisch einen Admin-User:
- **Email**: `admin@diy-humanoid-configurator.com`
- **Passwort**: `admin123` (BITTE IN PRODUCTION ÄNDERN!)
- **Rolle**: ADMIN

## 🔧 API Endpoints

### Auth Endpoints

```
POST   /api/auth/register        - Benutzer registrieren
POST   /api/auth/login           - Anmelden
POST   /api/auth/refresh         - Token erneuern
POST   /api/auth/logout          - Abmelden
GET    /api/auth/me              - Aktueller Benutzer
POST   /api/auth/forgot-password - Passwort vergessen
POST   /api/auth/reset-password  - Passwort zurücksetzen
POST   /api/auth/verify-email    - Email verifizieren
POST   /api/auth/resend-verification - Verifikation erneut senden
```

### Admin Endpoints (Erweitert)

```
GET    /admin/users              - Benutzerverwaltung
PATCH  /admin/users/:id/role     - Benutzerrolle ändern
PATCH  /admin/users/:id/status   - Benutzer aktivieren/deaktivieren
GET    /admin/audit-logs         - Audit-Logs einsehen
GET    /admin/security           - Sicherheits-Dashboard
POST   /admin/system/cleanup-tokens - Abgelaufene Tokens löschen
POST   /admin/users/:id/logout   - Benutzer zwangsweise abmelden
```

## 🛡️ Sicherheits-Features

### Implementierte Schutzmaßnahmen

- **Passwort-Policy**: Min. 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen
- **Account Lockout**: 5 fehlgeschlagene Versuche = 15 Min. Sperre
- **Token Expiry**: Access Tokens 15 Min., Refresh Tokens 7 Tage
- **Rate Limiting**: 5 Login-Versuche pro 15 Min., 10 API-Requests pro 15 Min.
- **CORS Protection**: Nur definierte Origins erlaubt
- **Helmet Security Headers**: XSS, Clickjacking, etc. Protection
- **SQL Injection Prevention**: Prisma ORM mit parametrisierten Queries

### Audit Logging

Alle kritischen Aktionen werden geloggt:
- Login/Logout Versuche
- Admin-Aktionen (Benutzer ändern, System-Konfiguration)
- Password-Resets und Email-Verifikationen
- API-Zugriffe mit IP-Adressen und User-Agents

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test                    # Alle Tests
npm run test:integration    # Nur Integration Tests
npm run test:watch         # Watch-Modus
```

Test Coverage:
- ✅ User Registration Flow
- ✅ Login/Logout Flow  
- ✅ Token Refresh Mechanism
- ✅ Password Reset Flow
- ✅ Email Verification
- ✅ Role-based Access Control
- ✅ Rate Limiting
- ✅ Security Headers

### Frontend Tests

```bash
cd frontend
npm test                    # Vitest Tests
npm run test:e2e            # Playwright E2E Tests
```

Test Coverage:
- ✅ LoginForm Component
- ✅ RegisterForm Component
- ✅ ProtectedRoute Logic
- ✅ AuthContext State Management
- ✅ Password Strength Validation

## 🚦 Produktions-Checklist

### Vor Production Deployment:

- [ ] **Admin Password ändern**: Standard-Admin-Password `admin123` ersetzen
- [ ] **JWT Secrets generieren**: Mindestens 32 Zeichen lange, sichere Secrets
- [ ] **HTTPS aktivieren**: `COOKIE_SECURE=true` setzen
- [ ] **Email-Konfiguration**: Production SMTP-Server konfigurieren
- [ ] **Database Backup**: Backup-Strategie für User-Daten implementieren
- [ ] **Rate Limits anpassen**: Je nach erwarteter Last
- [ ] **Monitoring einrichten**: Fehler-Logging und Performance-Monitoring
- [ ] **CORS Origins**: Nur Production-Domains erlauben
- [ ] **SSL Certificate**: Gültiges SSL für Email-Links
- [ ] **2FA aktivieren**: Für alle Admin-Benutzer empfohlen

### Security Monitoring

```bash
# Admin Dashboard: /admin/security
# - Aktive Benutzer
# - Fehlgeschlagene Login-Versuche
# - Verdächtige Aktivitäten
# - Recent Logins

# Audit Logs: /admin/audit-logs
# - Alle Admin-Aktionen
# - Filtierbar nach Benutzer, Aktion, Datum
# - Export-Funktion für Compliance
```

## 🆘 Troubleshooting

### Häufige Probleme

1. **Database Connection Failed**
   ```
   Error: P1001: Can't reach database server
   ```
   - Lösung: PostgreSQL starten, DATABASE_URL prüfen

2. **Email not sending**
   ```
   Error: Authentication failed
   ```
   - Lösung: Gmail App Password verwenden, SMTP-Einstellungen prüfen

3. **JWT Token Invalid**
   ```
   Error: JWT_SECRET not configured
   ```
   - Lösung: JWT_SECRET in .env setzen (min. 32 Zeichen)

4. **CORS Error in Frontend**
   ```
   Error: blocked by CORS policy
   ```
   - Lösung: CORS_ORIGIN in Backend .env korrekt setzen

### Debug Commands

```bash
# Email-Konfiguration testen
node scripts/test-email.js --config-check

# Database-Verbindung testen
npx prisma db push --preview-feature

# JWT Token dekodieren (Browser Console)
JSON.parse(atob(token.split('.')[1]))

# Prisma Studio für Database-Inspektion
npx prisma studio
```

## 📚 Code-Struktur

```
backend/
├── src/
│   ├── services/
│   │   ├── authService.js       # Kern Auth-Logik
│   │   └── emailService.js      # Email-Templates & Versand
│   ├── middleware/
│   │   ├── auth.js              # JWT & RBAC Middleware
│   │   └── audit.js             # Audit-Logging
│   └── routes/
│       └── auth.js              # Auth API Endpoints
├── tests/
│   └── auth.test.js             # Comprehensive Auth Tests
├── scripts/
│   └── test-email.js            # Email Service Test Tool
└── migrations/
    └── 001_add_auth_system.sql  # Database Migration

frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx      # Auth State Management
│   ├── components/auth/
│   │   ├── LoginForm.jsx        # Login Component
│   │   ├── RegisterForm.jsx     # Registration Component
│   │   ├── ProtectedRoute.jsx   # Route Protection
│   │   ├── UserMenu.jsx         # User Interface
│   │   └── AuthModal.jsx        # Modal Auth Forms
│   └── pages/auth/
│       ├── LoginPage.jsx        # Login Page
│       ├── ResetPasswordPage.jsx# Password Reset Page
│       └── VerifyEmailPage.jsx  # Email Verification Page
└── tests/components/auth/       # Component Tests
```

## 🎯 Nächste Schritte

Nach dem Setup können Sie:

1. **Benutzer registrieren**: Gehen Sie zu `/login?mode=register`
2. **Admin-Dashboard nutzen**: Login als Admin → `/admin`
3. **API testen**: Nutzen Sie die Auth-Endpoints
4. **Customization**: Passen Sie Email-Templates an Ihr Branding an
5. **2FA implementieren**: Erweitern Sie das System um TOTP-basierte 2FA

Das Authentifikations-System ist produktionsreif und skalierbar implementiert! 🚀