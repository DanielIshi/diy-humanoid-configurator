# 📊 Monitoring & Logging Setup - DIY Humanoid Configurator

## Übersicht
Komplette Anleitung für Production Monitoring, Error Tracking, Performance Monitoring und Logging Setup.

---

## 🚨 ERROR TRACKING (Sentry)

### Frontend Sentry Setup

#### 1. Sentry Projekt erstellen
```bash
# 1. Gehe zu sentry.io und erstelle Account
# 2. Create Project → React
# 3. Kopiere DSN: https://abc123@o123456.ingest.sentry.io/123456
```

#### 2. Frontend Integration
```bash
# Dependencies installieren
cd frontend
npm install @sentry/react @sentry/tracing
```

```javascript
// frontend/src/main.jsx
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Sentry initialisieren
if (import.meta.env.VITE_APP_ENV === 'production') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing(),
    ],
    environment: import.meta.env.VITE_APP_ENV,
    tracesSampleRate: 0.1, // 10% der Transaktionen tracken
    release: import.meta.env.VITE_APP_VERSION,
    beforeSend(event) {
      // Sensitive Daten filtern
      if (event.request?.url?.includes('password')) {
        return null;
      }
      return event;
    }
  });
}
```

#### 3. Vercel Environment Variables
```bash
vercel env add VITE_SENTRY_DSN production
# Eingabe: https://abc123@o123456.ingest.sentry.io/123456

vercel env add VITE_APP_VERSION production  
# Eingabe: 0.7.0
```

### Backend Sentry Setup

#### 1. Backend Integration
```bash
cd backend
npm install @sentry/node @sentry/tracing
```

```javascript
// backend/src/index.js (am Anfang)
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

// Sentry initialisieren
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    release: process.env.APP_VERSION || "0.7.0",
    beforeSend(event) {
      // JWT Tokens und Passwörter herausfiltern
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = '[Filtered]';
      }
      return event;
    }
  });
}

// Express Error Handler (nach allen Routen)
app.use(Sentry.Handlers.errorHandler());
```

#### 2. Railway Environment Variables
```bash
railway variables set SENTRY_DSN="https://def456@o123456.ingest.sentry.io/789012"
railway variables set SENTRY_ENVIRONMENT="production"
railway variables set APP_VERSION="0.7.0"
```

---

## 📈 PERFORMANCE MONITORING

### Vercel Analytics

#### 1. Aktivierung
```bash
# In Vercel Dashboard:
# Project → Analytics Tab → Enable Analytics
# Real User Monitoring automatisch aktiv
```

#### 2. Web Vitals Tracking
```javascript
// frontend/src/utils/analytics.js
export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
}

// In main.jsx
import { reportWebVitals } from './utils/analytics';

reportWebVitals((metric) => {
  // An Sentry senden
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_category: 'Web Vitals',
    });
  }
});
```

### Backend Performance Monitoring

#### 1. Railway Metrics
```bash
# Railway bietet integrierte Metriken:
railway metrics --service backend

# CPU Usage, Memory, Response Time, Error Rate
```

#### 2. Custom Performance Tracking
```javascript
// backend/src/middleware/performance.js
import { performance } from 'perf_hooks';

export const performanceMiddleware = (req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    
    // Log langsame Requests (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
    
    // An Sentry senden für Production
    if (process.env.NODE_ENV === 'production') {
      Sentry.addBreadcrumb({
        category: 'performance',
        data: {
          method: req.method,
          path: req.path,
          duration: duration,
          status: res.statusCode
        },
        level: duration > 1000 ? 'warning' : 'info'
      });
    }
  });
  
  next();
};
```

---

## 📊 UPTIME MONITORING

### UptimeRobot Setup

#### 1. Account erstellen
```bash
# 1. Gehe zu uptimerobot.com
# 2. Erstelle kostenlosen Account
# 3. Create New Monitor
```

#### 2. Monitor Konfiguration
```yaml
Monitor Type: HTTP(s)
Friendly Name: DIY Humanoid Backend Health
URL: https://diy-humanoid-configurator-backend.railway.app/api/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds

Alert Contacts:
  Email: admin@your-domain.com
  Notification: When monitor goes DOWN
```

#### 3. Frontend Monitor
```yaml
Monitor Type: HTTP(s)  
Friendly Name: DIY Humanoid Frontend
URL: https://diy-humanoid-configurator.vercel.app
Monitoring Interval: 5 minutes
Keywords: DIY Humanoid Configurator (Title Check)
```

### Healthcheck Endpoints

#### Backend Health Check (bereits implementiert)
```javascript
// backend/src/routes/health.js
app.get('/api/health', async (req, res) => {
  try {
    // Database Check
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '0.7.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});
```

---

## 📝 STRUCTURED LOGGING

### Winston Logger Setup (Backend)

#### 1. Winston installieren
```bash
cd backend
npm install winston winston-daily-rotate-file
```

#### 2. Logger konfigurieren
```javascript
// backend/src/utils/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      stack,
      ...meta
    });
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'diy-humanoid-backend',
    version: process.env.APP_VERSION || '0.7.0',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Konsole (Development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Datei (Production)
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Error Log
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  
  // Uncaught Exceptions
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD'
    })
  ],
  
  // Unhandled Promise Rejections
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD'
    })
  ]
});

export default logger;
```

#### 3. Logger verwenden
```javascript
// backend/src/middleware/requestLogger.js
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Request Info
  logger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    sessionId: req.sessionID
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length')
    });
  });
  
  next();
};
```

### Frontend Logging

#### 1. Browser Logger
```javascript
// frontend/src/utils/logger.js
class Logger {
  constructor() {
    this.isDev = import.meta.env.VITE_APP_ENV === 'development';
    this.apiUrl = import.meta.env.VITE_API_URL;
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Console output (immer)
    if (this.isDev) {
      console[level] || console.log(message, data);
    }

    // An Backend senden (nur Production)
    if (!this.isDev && level === 'error') {
      this.sendToBackend(logEntry);
    }

    // An Sentry senden
    if (window.Sentry && level === 'error') {
      window.Sentry.captureException(new Error(message), {
        extra: data
      });
    }
  }

  async sendToBackend(logEntry) {
    try {
      await fetch(`${this.apiUrl}/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error('Failed to send log to backend:', error);
    }
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

export const logger = new Logger();
```

---

## 🔍 LOG AGGREGATION & ANALYSIS

### Centralized Logging (Optional)

#### 1. LogDNA/Mezmo Setup
```bash
# Für erweiterte Log-Analyse (kostenpflichtig)
# Alternative: ELK Stack (Elasticsearch, Logstash, Kibana)

# Railway Plugin installieren
railway add logdna

# Environment Variable setzen
railway variables set LOGDNA_INGESTION_KEY="your_logdna_key"
```

#### 2. Custom Log Aggregation Endpoint
```javascript
// backend/src/routes/logs.js
import express from 'express';
import logger from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Frontend Logs empfangen
router.post('/frontend', express.json(), (req, res) => {
  const { timestamp, level, message, data, url, userAgent } = req.body;
  
  // Frontend Log in Backend Logger weiterleiten
  logger[level]('Frontend Log', {
    source: 'frontend',
    originalTimestamp: timestamp,
    message,
    data,
    clientUrl: url,
    clientUserAgent: userAgent,
    serverTimestamp: new Date().toISOString()
  });
  
  res.status(200).json({ status: 'logged' });
});

// Log Query API (für Admin Dashboard)
router.get('/query', authenticate, async (req, res) => {
  const { level, limit = 100, from, to } = req.query;
  
  try {
    // Hier könntest du Log-Dateien lesen oder aus einer DB abfragen
    // Vereinfachte Implementierung:
    const logs = await readRecentLogs(level, limit, from, to);
    res.json({ logs });
  } catch (error) {
    logger.error('Log query failed', { error: error.message });
    res.status(500).json({ error: 'Log query failed' });
  }
});

export default router;
```

---

## 📧 ALERT NOTIFICATIONS

### Email Alerts Setup

#### 1. Critical Error Alerts
```javascript
// backend/src/utils/alerting.js
import nodemailer from 'nodemailer';
import logger from './logger.js';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendCriticalAlert(error, context = {}) {
  if (process.env.NODE_ENV !== 'production') return;
  
  const subject = `🚨 Critical Error - DIY Humanoid Configurator`;
  const html = `
    <h2>Critical Error Alert</h2>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
    <p><strong>Error:</strong> ${error.message}</p>
    <p><strong>Stack:</strong></p>
    <pre>${error.stack}</pre>
    <p><strong>Context:</strong></p>
    <pre>${JSON.stringify(context, null, 2)}</pre>
    
    <p><a href="https://sentry.io/organizations/your-org/issues/">View in Sentry</a></p>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.ALERT_EMAIL || 'admin@your-domain.com',
      subject,
      html
    });
    
    logger.info('Critical alert email sent', { error: error.message });
  } catch (emailError) {
    logger.error('Failed to send critical alert email', { 
      originalError: error.message,
      emailError: emailError.message 
    });
  }
}

// Error Handler mit Alerting
export function setupErrorHandler(app) {
  app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body
    });
    
    // Kritische Errors per Email melden
    if (error.critical || res.statusCode >= 500) {
      sendCriticalAlert(error, {
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      timestamp: new Date().toISOString()
    });
  });
}
```

### Slack/Discord Webhooks (Optional)

#### 1. Slack Integration
```javascript
// backend/src/utils/slackNotifications.js
export async function sendSlackAlert(message, severity = 'error') {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  const color = {
    error: 'danger',
    warning: 'warning', 
    info: 'good'
  }[severity];
  
  const payload = {
    text: `DIY Humanoid Configurator Alert`,
    attachments: [{
      color,
      fields: [
        {
          title: 'Environment',
          value: process.env.NODE_ENV,
          short: true
        },
        {
          title: 'Timestamp',
          value: new Date().toISOString(),
          short: true
        },
        {
          title: 'Message',
          value: message,
          short: false
        }
      ]
    }]
  };
  
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    logger.error('Failed to send Slack notification', { error: error.message });
  }
}
```

---

## 🎯 MONITORING DASHBOARD

### Custom Admin Dashboard Integration

#### 1. Backend Metrics API
```javascript
// backend/src/routes/admin/metrics.js
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const metrics = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.APP_VERSION
      },
      database: {
        users: await prisma.user.count(),
        orders: await prisma.order.count(),
        products: await prisma.product.count()
      },
      performance: {
        avgResponseTime: await getAverageResponseTime(),
        errorRate: await getErrorRate(),
        throughput: await getThroughput()
      },
      health: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        stripe: await checkStripeHealth()
      }
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics query failed', { error: error.message });
    res.status(500).json({ error: 'Metrics unavailable' });
  }
});
```

#### 2. Frontend Monitoring Dashboard
```jsx
// frontend/src/pages/admin/Monitoring.jsx
import { useEffect, useState } from 'react';

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 30s
    return () => clearInterval(interval);
  }, []);
  
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };
  
  return (
    <div className="monitoring-dashboard">
      <h1>System Monitoring</h1>
      
      {/* System Health */}
      <div className="health-cards">
        <HealthCard title="Database" status={metrics?.health?.database} />
        <HealthCard title="Redis" status={metrics?.health?.redis} />
        <HealthCard title="Stripe" status={metrics?.health?.stripe} />
      </div>
      
      {/* Performance Metrics */}
      <div className="metrics-grid">
        <MetricChart 
          title="Response Time" 
          value={metrics?.performance?.avgResponseTime}
          unit="ms"
        />
        <MetricChart 
          title="Error Rate" 
          value={metrics?.performance?.errorRate}
          unit="%"
        />
      </div>
      
      {/* Recent Logs */}
      <LogViewer logs={logs} />
    </div>
  );
}
```

---

## 🎯 MONITORING CHECKLIST

### Setup Checklist ✅

#### Error Tracking
- [ ] Sentry Frontend Projekt erstellt
- [ ] Sentry Backend Projekt erstellt  
- [ ] DSN Environment Variables gesetzt
- [ ] Error Filtering konfiguriert
- [ ] Source Maps Upload konfiguriert
- [ ] Test Errors versendet

#### Performance Monitoring
- [ ] Vercel Analytics aktiviert
- [ ] Web Vitals Tracking implementiert
- [ ] Backend Performance Middleware
- [ ] Railway Metrics konfiguriert
- [ ] Slow Query Logging aktiviert

#### Uptime Monitoring  
- [ ] UptimeRobot Account erstellt
- [ ] Backend Health Monitor konfiguriert
- [ ] Frontend Availability Monitor
- [ ] Alert Kontakte hinzugefügt
- [ ] Test Notifications versendet

#### Logging
- [ ] Winston Logger konfiguriert
- [ ] Log Rotation eingerichtet
- [ ] Frontend Error Logging
- [ ] Sensitive Data Filtering
- [ ] Log Level korrekt gesetzt

#### Alerting
- [ ] Email SMTP konfiguriert
- [ ] Critical Error Alerts
- [ ] Slack/Discord Webhooks (optional)
- [ ] Alert Thresholds definiert
- [ ] Escalation Procedures dokumentiert

### Production Readiness ✅

- [ ] Alle Monitoring Services aktiv
- [ ] Dashboard verfügbar
- [ ] Alerts getestet
- [ ] Runbooks erstellt
- [ ] On-Call Procedures definiert

---

**🎉 Monitoring Setup vollständig! Deine App ist jetzt überwacht und alertiert bei Problemen.**

**Monitoring URLs:**
- Sentry: https://sentry.io/organizations/your-org/
- UptimeRobot: https://stats.uptimerobot.com/your-id
- Railway Metrics: https://railway.app/project/your-project
- Vercel Analytics: https://vercel.com/your-team/your-project/analytics