# Price Scraping Engine - DIY Humanoid Configurator

Eine robuste, production-ready Price-Scraping Engine für das DIY Humanoid Configurator Backend.

## 🚀 Features

- **Anti-Bot Protection**: User-Agent Rotation, zufällige Delays, echte Browser Headers
- **Site-spezifische Scraper**: Optimierte Selektoren für jeden Händler
- **Robustes Error Handling**: Graceful failures mit strukturierten Fehlermeldungen
- **Retry Logic**: Exponential backoff für fehlgeschlagene Requests
- **Caching**: In-Memory-Cache mit konfigurierbarer TTL
- **Parallel Processing**: Kontrollierte Parallelisierung mit Rate Limiting

## 📊 Unterstützte Händler

- electropeak.com
- srituhobby.com  
- kubii.com
- eu.robotshop.com
- welectron.com
- mg-modellbau.de
- optics-pro.com
- gensace.de
- prusa3d.com
- eu.mouser.com

## 🛠 Installation

```bash
npm install puppeteer
```

## 💻 Programmatische Nutzung

### Grundlegende Nutzung

```javascript
import { PriceScraper, scrapePriceForProduct, scrapeAllPrices } from './price-scraper.js';

// Einzelnes Produkt scrapen
const result = await scrapePriceForProduct('MG996R');
console.log(result);

// Alle Produkte scrapen
const results = await scrapeAllPrices({ concurrentLimit: 2 });
console.log(results);

// Erweiterte Nutzung mit PriceScraper-Klasse
const scraper = new PriceScraper({
  headless: true,
  timeout: 15000,
  maxRetries: 3,
  minDelay: 2000,
  maxDelay: 5000
});

const result = await scraper.scrapePrice(url, productKey);
await scraper.close();
```

### Konfiguration

```javascript
const options = {
  headless: true,        // Headless Browser (default: true)
  timeout: 15000,        // Timeout pro Site (default: 15000ms)
  maxRetries: 3,         // Maximale Wiederholungen (default: 3)
  minDelay: 2000,        // Minimale Verzögerung (default: 2000ms)
  maxDelay: 5000,        // Maximale Verzögerung (default: 5000ms)
  concurrentLimit: 2     // Parallel Requests (default: 3)
};
```

## 🌐 REST API Endpoints

### GET /api/prices

Alle aktuellen Preise abrufen.

**Query Parameters:**
- `refresh` (boolean): Cache ignorieren und neu scrapen
- `products` (string): Komma-getrennte Produktliste (optional)

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 14,
    "successful": 12,
    "failed": 2,
    "cached": 5,
    "scraped": 9,
    "successRate": "85.7%"
  },
  "timestamp": "2025-09-03T10:30:00.000Z",
  "data": [...]
}
```

### GET /api/prices/:productKey

Einzelnen Produktpreis abrufen.

**Parameters:**
- `productKey`: Produktschlüssel (z.B. "MG996R")

**Query Parameters:**
- `refresh` (boolean): Cache ignorieren und neu scrapen

**Response:**
```json
{
  "success": true,
  "cached": false,
  "data": {
    "productKey": "MG996R",
    "product": {
      "name": "Leichtes Metall-Servo MG996R",
      "supplier": "ElectroPeak",
      "category": "SERVO",
      "originalPrice": 6.2,
      "url": "https://electropeak.com/..."
    },
    "success": true,
    "scrapedPrice": 6.5,
    "currency": "€",
    "availability": "in-stock",
    "timestamp": "2025-09-03T10:30:00.000Z",
    "error": null,
    "priceDifference": "0.30",
    "priceChangePercent": "4.8"
  },
  "timestamp": "2025-09-03T10:30:00.000Z"
}
```

### POST /api/prices/refresh

Cache löschen und alle Preise neu scrapen.

**Response:**
```json
{
  "success": true,
  "message": "Price refresh completed",
  "summary": {
    "total": 14,
    "successful": 13,
    "failed": 1,
    "successRate": "92.9%"
  },
  "timestamp": "2025-09-03T10:30:00.000Z",
  "data": [...]
}
```

### GET /api/prices/cache/status

Cache-Status und Statistiken abrufen.

**Response:**
```json
{
  "success": true,
  "cache": {
    "size": 8,
    "ttl": 1800000,
    "entries": [
      {
        "productKey": "MG996R",
        "age": 120,
        "remaining": 1680,
        "success": true
      }
    ]
  },
  "timestamp": "2025-09-03T10:30:00.000Z"
}
```

## 🧪 Testing

### Command Line Testing

```bash
# Alle Tests ausführen
node src/scraper/test-scraper.js

# Einzelnes Produkt testen
node src/scraper/test-scraper.js single MG996R

# Performance Test
node src/scraper/test-scraper.js performance

# Alle Produkte testen (Vorsicht!)
node src/scraper/test-scraper.js all
```

### API Testing

```bash
# Einzelnen Preis testen
curl http://localhost:3001/api/prices/MG996R

# Cache-Status prüfen
curl http://localhost:3001/api/prices/cache/status

# Alle Preise mit Refresh
curl "http://localhost:3001/api/prices?refresh=true"

# Cache refresh
curl -X POST http://localhost:3001/api/prices/refresh
```

## 📈 Performance

- **Einzelner Scrape**: ~3-8 Sekunden pro Produkt
- **Parallel Scraping**: 2-3 Produkte gleichzeitig (Rate Limiting)
- **Cache Hit**: < 50ms Response Time
- **Success Rate**: 85-95% (abhängig von Site-Verfügbarkeit)

## 🔧 Erweiterte Konfiguration

### Site-spezifische Selektoren hinzufügen

```javascript
const SITE_SELECTORS = {
  'neuer-shop.de': {
    price: ['.preis', '.product-price'],
    availability: ['.verfügbarkeit', '.lagerstand'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  }
};
```

### Error Handling

```javascript
import { ScrapingError } from './price-scraper.js';

try {
  const result = await scrapePriceForProduct('INVALID_KEY');
} catch (error) {
  if (error instanceof ScrapingError) {
    console.log(`Code: ${error.code}`);
    console.log(`Details:`, error.details);
  }
}
```

## 🚨 Wichtige Hinweise

### Rate Limiting

- Maximale Parallelität: 2-3 Requests
- Zufällige Delays: 2-5 Sekunden zwischen Requests
- Exponential Backoff bei Fehlern

### Cache Management

- TTL: 30 Minuten (konfigurierbar)
- In-Memory (bei Server-Restart verloren)
- Für Production: Redis/Database-Backend empfohlen

### Anti-Bot Measures

- User-Agent Rotation (5 aktuelle Browser)
- Zufällige Viewport-Größen
- Realistische HTTP Headers
- Random Delays zwischen Aktionen

### Compliance

- Respektiere robots.txt
- Nutze moderate Request-Raten
- Implementiere Backoff bei 429/503 Responses
- Berücksichtige Terms of Service der Händler

## 🐛 Troubleshooting

### Häufige Probleme

1. **Timeout Errors**: Erhöhe `timeout` Option
2. **Selector Not Found**: Prüfe Site-Änderungen, aktualisiere Selektoren  
3. **Anti-Bot Detection**: Reduziere `concurrentLimit`, erhöhe Delays
4. **Memory Issues**: Implementiere Browser-Pooling für High-Volume

### Debugging

```javascript
// Headless deaktivieren für visuelle Inspektion
const scraper = new PriceScraper({ headless: false });

// Console Logs aktivieren
process.env.DEBUG = 'puppeteer:*';
```

### Monitoring

```javascript
// Performance Tracking
const startTime = Date.now();
const result = await scrapePriceForProduct('MG996R');
console.log(`Duration: ${Date.now() - startTime}ms`);

// Error Tracking
if (!result.success) {
  console.error(`Failed: ${result.error.code} - ${result.error.message}`);
}
```

## 📝 Changelog

### Version 1.0.0
- Initiale Implementation
- 10 Händler unterstützt
- REST API Integration
- Comprehensive Testing Suite
- Anti-Bot Protection
- Caching System