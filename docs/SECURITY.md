# Sicherheitsrichtlinien - DIY Humanoid Configurator

## 🔒 Sicherheitsstrategie

Der DIY Humanoid Configurator implementiert umfassende Sicherheitsmaßnahmen zum Schutz von Benutzerdaten, Zahlungsinformationen und Geschäftslogik.

## 🚨 Sicherheitslücken melden

### Verantwortliche Disclosure
Wenn Sie eine Sicherheitslücke entdecken, kontaktieren Sie uns bitte **privat**:

- **E-Mail**: security@diy-humanoid-configurator.com
- **PGP-Key**: [Öffentlicher Schlüssel](https://keys.openpgp.org)
- **GitHub Security**: [Private Vulnerability Reporting](https://github.com/username/diy-humanoid-configurator/security/advisories)

**Bitte KEINE öffentlichen Issues** für Sicherheitsprobleme erstellen.

### Was zu melden ist
- SQL-Injection-Schwachstellen
- Cross-Site-Scripting (XSS)
- Authentifizierungs-Bypässe
- Privilege-Escalation
- Daten-Exposition
- Payment-System-Schwachstellen
- Server-Side Request Forgery (SSRF)
- Unsichere Konfigurationen

### Response-Timeline
- **24 Stunden**: Bestätigung des Empfangs
- **72 Stunden**: Erste Bewertung der Schwachstelle
- **7 Tage**: Detaillierte Analyse und Lösungsplan
- **30 Tage**: Fix-Deployment (je nach Kritikalität)

### Anerkennung
Verantwortliche Researcher werden in unserer [Hall of Fame](#hall-of-fame) aufgeführt (mit Einverständnis).

---

## 🛡️ Implementierte Sicherheitsmaßnahmen

### Authentifizierung & Autorisierung

#### JWT-Token-Sicherheit
```javascript
// Token-Generierung mit sicheren Parametern
const token = jwt.sign(
  { userId, role, email },
  process.env.JWT_SECRET, // Mindestens 256-bit Secret
  {
    expiresIn: '7d',
    issuer: 'diy-humanoid-configurator',
    audience: 'diy-humanoid-users',
    algorithm: 'HS256'
  }
);

// Token-Validierung mit Blacklist-Check
const validateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      throw new Error('Token ist ungültig');
    }
    
    return decoded;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
};
```

#### Passwort-Sicherheit
```javascript
// Sichere Passwort-Hashierung
const hashPassword = async (password) => {
  const saltRounds = 12; // Hohe Kostenfaktor
  return bcrypt.hash(password, saltRounds);
};

// Passwort-Validation
const passwordSchema = z.string()
  .min(8, 'Mindestens 8 Zeichen')
  .max(128, 'Maximal 128 Zeichen')
  .regex(/(?=.*[a-z])/, 'Mindestens ein Kleinbuchstabe')
  .regex(/(?=.*[A-Z])/, 'Mindestens ein Großbuchstabe')
  .regex(/(?=.*\d)/, 'Mindestens eine Zahl')
  .regex(/(?=.*[@$!%*?&])/, 'Mindestens ein Sonderzeichen');
```

### Input-Validation & Sanitization

#### Request-Validation mit Zod
```javascript
// Komponenten-Schema mit strikter Validierung
const componentSchema = z.object({
  name: z.string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9\s\-._]+$/, 'Nur alphanumerische Zeichen erlaubt'),
  
  price: z.number()
    .positive('Preis muss positiv sein')
    .max(10000, 'Maximalpreis: €10.000'),
  
  specifications: z.record(z.string())
    .refine(obj => Object.keys(obj).length <= 20, 'Max. 20 Spezifikationen'),
  
  category: z.enum(['servos', 'controllers', 'sensors', 'power_supplies'])
});

// XSS-Schutz durch Sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Keine HTML-Tags erlaubt
    ALLOWED_ATTR: []  // Keine Attribute erlaubt
  });
};
```

#### SQL-Injection-Schutz
```javascript
// Prisma ORM verhindert SQL-Injections automatisch
const getComponentsByCategory = async (category) => {
  // Sichere parametrisierte Abfrage
  return prisma.component.findMany({
    where: {
      category: category, // Automatisch escaped von Prisma
      availability: {
        in_stock: true
      }
    },
    select: {
      id: true,
      name: true,
      price: true,
      // Sensible Felder ausgeschlossen
    }
  });
};
```

### HTTP-Security Headers

#### Helmet.js-Konfiguration
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000, // 1 Jahr
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  crossOriginEmbedderPolicy: false // Für Stripe-Kompatibilität
}));
```

### Rate Limiting & DDoS-Schutz

#### Multi-Layer Rate Limiting
```javascript
// Globales Rate Limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 1000, // 1000 Requests pro IP
  message: {
    error: 'Zu viele Anfragen, versuchen Sie es später erneut'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strikte Limits für sensible Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // 5 Login-Versuche
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}-${req.body.email || 'anonymous'}`
});

// Payment-Endpoint-Schutz
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10, // 10 Payment-Versuche pro Stunde
  keyGenerator: (req) => req.user?.id || req.ip
});
```

### Payment-Security

#### Stripe-Integration-Sicherheit
```javascript
// Sichere Webhook-Verifikation
const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  req.stripeEvent = event;
  next();
};

// Idempotenz-Schlüssel für Payment-Requests
const createPaymentIntent = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || 
                         crypto.randomUUID();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: 'eur',
    metadata: {
      orderId: req.body.orderId
    }
  }, {
    idempotencyKey
  });

  res.json({ clientSecret: paymentIntent.client_secret });
};
```

#### PCI DSS Compliance
- **Keine Kartendaten-Speicherung**: Stripe Elements für sichere Eingabe
- **Tokenisierung**: Nur Payment-Tokens werden verarbeitet
- **Verschlüsselte Übertragung**: HTTPS für alle Payment-Endpoints
- **Audit-Logging**: Alle Payment-Transaktionen protokolliert

### Daten-Verschlüsselung

#### Sensitive Daten-Verschlüsselung
```javascript
const crypto = require('crypto');

const encrypt = (text, key = process.env.ENCRYPTION_KEY) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Verwendung für sensible Benutzerdaten
const encryptSensitiveData = async (userData) => {
  if (userData.personalInfo) {
    userData.personalInfo = encrypt(JSON.stringify(userData.personalInfo));
  }
  return userData;
};
```

### Logging & Monitoring

#### Security-Event-Logging
```javascript
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    }),
    new winston.transports.File({
      filename: 'logs/security-error.log',
      level: 'error'
    })
  ]
});

// Security-Events protokollieren
const logSecurityEvent = (type, details, req) => {
  securityLogger.warn('Security Event', {
    type,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
};

// Verwendung
app.use('/api/auth/login', (req, res, next) => {
  // Login-Versuche protokollieren
  logSecurityEvent('LOGIN_ATTEMPT', {
    email: req.body.email,
    success: false // Wird bei erfolgreichem Login überschrieben
  }, req);
  
  next();
});
```

#### Verdächtige Aktivitäten erkennen
```javascript
const detectSuspiciousActivity = async (req, res, next) => {
  const ip = req.ip;
  const userId = req.user?.id;
  
  // Häufigkeit von Requests prüfen
  const requestCount = await redis.incr(`requests:${ip}:${Date.now() / 1000 | 0}`);
  await redis.expire(`requests:${ip}:${Date.now() / 1000 | 0}`, 60);
  
  if (requestCount > 100) { // 100 Requests pro Minute
    logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      type: 'HIGH_REQUEST_FREQUENCY',
      requestCount,
      timeWindow: '1 minute'
    }, req);
    
    return res.status(429).json({
      error: 'Verdächtige Aktivität erkannt'
    });
  }
  
  // Ungewöhnliche Geo-Locations prüfen
  if (userId) {
    const lastLocation = await redis.get(`location:${userId}`);
    const currentLocation = req.headers['cf-ipcountry']; // Cloudflare
    
    if (lastLocation && lastLocation !== currentLocation) {
      logSecurityEvent('LOCATION_CHANGE', {
        userId,
        oldLocation: lastLocation,
        newLocation: currentLocation
      }, req);
      
      // Optional: Multi-Factor-Authentication anfordern
    }
    
    await redis.setex(`location:${userId}`, 3600, currentLocation);
  }
  
  next();
};
```

---

## 🔐 DSGVO & Datenschutz

### Datenminimierung
```javascript
// Nur notwendige Daten sammeln
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  // Keine optionalen persönlichen Daten ohne explizite Einwilligung
});

// Automatische Daten-Bereinigung
const cleanupOldData = async () => {
  // Alte Logs nach 90 Tagen löschen
  await prisma.log.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      }
    }
  });
  
  // Unbestätigte Accounts nach 30 Tagen löschen
  await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      createdAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  });
};
```

### Benutzerrechte (DSGVO Art. 15-22)
```javascript
// Recht auf Auskunft (Art. 15)
const exportUserData = async (userId) => {
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      configurations: true,
      orders: true,
      reviews: true
    }
  });
  
  // Sensible Daten entfernen
  delete userData.passwordHash;
  delete userData.internalNotes;
  
  return userData;
};

// Recht auf Löschung (Art. 17)
const deleteUserData = async (userId) => {
  await prisma.$transaction([
    // Persönliche Daten löschen, aber Orders anonymisieren
    prisma.order.updateMany({
      where: { userId },
      data: { 
        userId: null,
        customerEmail: 'deleted@privacy.local',
        shippingAddress: null
      }
    }),
    
    // User-Account löschen
    prisma.user.delete({
      where: { id: userId }
    })
  ]);
};

// Recht auf Datenportabilität (Art. 20)
const exportUserDataPortable = async (userId) => {
  const data = await exportUserData(userId);
  
  return {
    format: 'JSON',
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: data
  };
};
```

### Cookie-Consent & Tracking
```javascript
// Minimale Cookie-Nutzung
const cookieOptions = {
  httpOnly: true,      // XSS-Schutz
  secure: true,        // Nur über HTTPS
  sameSite: 'strict',  // CSRF-Schutz
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
  path: '/'
};

// Consent-Management
const trackingConsent = (req, res, next) => {
  const consent = req.cookies.tracking_consent;
  
  if (!consent || consent !== 'accepted') {
    // Keine Tracking-Cookies setzen
    req.trackingEnabled = false;
  } else {
    req.trackingEnabled = true;
  }
  
  next();
};
```

---

## 🛠️ Sicherheits-Entwicklungsrichtlinien

### Secure Coding Practices

#### 1. Input-Validation
```javascript
// ✅ Immer validieren und sanitizen
const createComponent = async (req, res) => {
  const validatedData = componentSchema.parse(req.body);
  const sanitizedData = sanitizeObject(validatedData);
  
  const component = await componentService.create(sanitizedData);
  res.json({ success: true, data: component });
};

// ❌ Niemals unvalidierte Daten verwenden
const createComponent = async (req, res) => {
  const component = await prisma.component.create({
    data: req.body // Gefährlich!
  });
  res.json(component);
};
```

#### 2. Error Handling
```javascript
// ✅ Sichere Fehlerbehandlung
const getUser = async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer nicht gefunden'
      });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    // Interne Fehler nicht preisgeben
    logger.error('Error in getUser:', error);
    
    res.status(500).json({
      success: false,
      error: 'Ein interner Fehler ist aufgetreten'
    });
  }
};
```

#### 3. Authorization Checks
```javascript
// ✅ Immer Berechtigungen prüfen
const updateOrder = async (req, res) => {
  const order = await orderService.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({ error: 'Bestellung nicht gefunden' });
  }
  
  // Benutzer darf nur eigene Bestellungen bearbeiten (oder Admin)
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  
  const updatedOrder = await orderService.update(req.params.id, req.body);
  res.json({ success: true, data: updatedOrder });
};
```

### Code-Review-Checkliste

#### Security-Aspekte prüfen:
- [ ] Input-Validation mit Zod-Schemas
- [ ] SQL-Injection-Schutz (Prisma verwendung)
- [ ] XSS-Schutz (Sanitization)
- [ ] Authorization-Checks für alle Endpoints
- [ ] Sensible Daten nicht in Logs
- [ ] Sichere Cookie-Einstellungen
- [ ] Rate-Limiting für kritische Endpoints
- [ ] Error-Handling ohne Information-Disclosure
- [ ] HTTPS-Enforcement in Production
- [ ] Sichere Umgebungsvariablen

---

## 🚀 Sicherheits-Testing

### Automatisierte Security-Tests

#### 1. OWASP ZAP Integration
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Application
        run: |
          docker-compose up -d
          sleep 30
      
      - name: OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3001'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

#### 2. npm audit Integration
```json
{
  "scripts": {
    "security:audit": "npm audit --audit-level moderate",
    "security:fix": "npm audit fix",
    "security:check": "npm run security:audit && cd frontend && npm run security:audit && cd ../backend && npm run security:audit"
  }
}
```

### Manuelle Security-Tests

#### 1. Penetration Testing Checkliste
- [ ] SQL-Injection-Tests
- [ ] XSS-Payload-Tests
- [ ] CSRF-Attack-Simulation
- [ ] Authentication-Bypass-Versuche
- [ ] Authorization-Escalation-Tests
- [ ] Session-Management-Tests
- [ ] File-Upload-Security-Tests
- [ ] API-Rate-Limiting-Tests

#### 2. Security-Test-Scripts
```javascript
// tests/security/auth.test.js
describe('Authentication Security', () => {
  it('should reject weak passwords', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123', // Schwaches Passwort
        name: 'Test User'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Mindestens 8 Zeichen');
  });
  
  it('should prevent brute force attacks', async () => {
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
    );
    
    await Promise.all(promises);
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(429); // Rate limited
  });
});
```

---

## 🔄 Incident Response Plan

### 1. Incident-Klassifizierung
- **Kritisch**: Datenleck, Payment-System-Kompromiss, Service-Ausfall
- **Hoch**: Unauthorized Access, Privilege Escalation
- **Medium**: DDoS, Minor Data Exposure
- **Niedrig**: Failed Login Attempts, Suspicious Activity

### 2. Response-Workflow
```
Incident Detection
        │
        ▼
Assessment & Classification
        │
        ▼
┌─────────────────┐
│   Containment   │
├─────────────────┤
│ - Isolate       │
│ - Block IPs     │
│ - Revoke Tokens │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Eradication   │
├─────────────────┤
│ - Fix Vulns     │
│ - Update Code   │
│ - Patch Systems │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│    Recovery     │
├─────────────────┤
│ - Deploy Fixes  │
│ - Restore Data  │
│ - Monitor       │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  Lessons Learned │
├─────────────────┤
│ - Document      │
│ - Improve       │
│ - Train         │
└─────────────────┘
```

### 3. Kommunikationsplan
- **Intern**: Security Team, Development Team, Management
- **Extern**: Betroffene Benutzer, Datenschutzbehörde (bei DSGVO-Verletzung)
- **Timeline**: Erste Benachrichtigung binnen 24h, Detail-Update binnen 72h

---

## 📋 Security-Checkliste für Production

### Pre-Deployment Security Review
- [ ] Alle Umgebungsvariablen sicher konfiguriert
- [ ] HTTPS-Zertifikate gültig und konfiguriert
- [ ] Rate-Limiting aktiviert
- [ ] Security Headers konfiguriert
- [ ] Datenbank-Zugänge beschränkt
- [ ] Backup-Strategien implementiert
- [ ] Monitoring und Alerting aktiviert
- [ ] Security-Logs konfiguriert
- [ ] Incident-Response-Plan dokumentiert
- [ ] Team über Security-Prozesse informiert

### Post-Deployment Monitoring
- [ ] Security-Logs täglich überprüfen
- [ ] Failed Authentication Attempts monitoren
- [ ] Unusual Traffic-Patterns erkennen
- [ ] Payment-Anomalien überwachen
- [ ] System-Updates regelmäßig einspielen
- [ ] Security-Scans monatlich durchführen
- [ ] Penetration Tests halbjährlich
- [ ] Team-Security-Training jährlich

---

## 🏆 Hall of Fame

Wir danken folgenden Security-Researchern für ihre Beiträge:

| Name | Contribution | Date | Severity |
|------|--------------|------|----------|
| [Name] | [Vulnerability Description] | 2024-01-01 | High |

*Möchten Sie hier aufgeführt werden? Melden Sie Sicherheitslücken verantwortungsvoll!*

---

## 📞 Kontakt

Bei Sicherheitsfragen oder -vorfällen:

- **Security Team**: security@diy-humanoid-configurator.com
- **Emergency**: +49-XXX-XXXXXXX (24/7 für kritische Incidents)
- **PGP**: [Security Team Public Key](https://keys.openpgp.org)

---

**Letzte Aktualisierung**: Januar 2025  
**Version**: 1.0.0