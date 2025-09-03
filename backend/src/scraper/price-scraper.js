/**
 * Robuste Price-Scraping Engine für DIY Humanoid Configurator
 * 
 * Features:
 * - Anti-Bot Protection (User-Agent Rotation, Random Delays)
 * - Site-spezifische Scraper mit Selector Maps
 * - Robustes Error Handling mit Retry Logic
 * - Graceful Failures mit Fallback
 * - Structured Error Messages
 * - Production-ready Implementation
 */

import puppeteer from 'puppeteer';
import { PARTS } from '../data/products.js';

/**
 * User-Agent Pool für Rotation (aktuelle Browser)
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
];

/**
 * Site-spezifische Selector Maps für Preise und Verfügbarkeit
 */
const SITE_SELECTORS = {
  'electropeak.com': {
    price: ['.price', '.product-price', '[data-price]', '.current-price', '.amount'],
    availability: ['.availability', '.stock-status', '[data-availability]', '.in-stock', '.out-of-stock'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'srituhobby.com': {
    price: ['.price', '.product-price', '.woocommerce-price', '.amount', '.current-price'],
    availability: ['.availability', '.stock', '.in-stock', '.out-of-stock', '.stock-status'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'kubii.com': {
    price: ['.price', '.current-price', '.product-price', '[data-price]', '.amount'],
    availability: ['.availability', '.stock-level', '.in-stock', '[data-availability]'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'eu.robotshop.com': {
    price: ['.price', '.product-price', '.current-price', '.amount', '[data-price]'],
    availability: ['.availability', '.stock-status', '.in-stock', '.out-of-stock'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'welectron.com': {
    price: ['.price', '.product-price', '.current-price', '.amount'],
    availability: ['.availability', '.stock', '.lagerbestand', '.verfügbarkeit'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'mg-modellbau.de': {
    price: ['.price', '.product-price', '.preis', '.current-price'],
    availability: ['.availability', '.lagerbestand', '.verfügbar', '.lieferzeit'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'optics-pro.com': {
    price: ['.price', '.product-price', '.current-price', '[data-price]'],
    availability: ['.availability', '.stock-status', '.in-stock'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'gensace.de': {
    price: ['.price', '.product-price', '.current-price', '.amount'],
    availability: ['.availability', '.stock', '.lagerbestand'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'prusa3d.com': {
    price: ['.price', '.product-price', '.current-price', '.amount'],
    availability: ['.availability', '.stock-status', '.in-stock'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  },
  'eu.mouser.com': {
    price: ['.price', '.product-price', '.current-price', '[data-price]'],
    availability: ['.availability', '.stock-level', '.in-stock'],
    fallbackPrice: /[\d,\.]+/,
    currency: '€'
  }
};

/**
 * Scraping Errors für strukturierte Fehlerbehandlung
 */
class ScrapingError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ScrapingError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Hauptklasse für Price Scraping mit Anti-Bot Features
 */
class PriceScraper {
  constructor(options = {}) {
    this.browser = null;
    this.options = {
      timeout: options.timeout || 15000, // 15s timeout
      maxRetries: options.maxRetries || 3,
      minDelay: options.minDelay || 2000, // 2s minimum delay
      maxDelay: options.maxDelay || 5000, // 5s maximum delay
      headless: options.headless !== false, // Default headless
      ...options
    };
    
    // Cache für Browser-Instanz
    this.browserPromise = null;
  }

  /**
   * Initialisiert Browser-Instanz mit Anti-Bot Features
   */
  async initBrowser() {
    if (this.browserPromise) {
      return this.browserPromise;
    }

    this.browserPromise = puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Für Windows compatibility
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-component-extensions-with-background-pages'
      ],
      defaultViewport: {
        width: 1366 + Math.floor(Math.random() * 200), // Viewport randomization
        height: 768 + Math.floor(Math.random() * 200)
      }
    });

    this.browser = await this.browserPromise;
    return this.browser;
  }

  /**
   * Extrahiert Domain aus URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      throw new ScrapingError('Invalid URL format', 'INVALID_URL', { url });
    }
  }

  /**
   * Wählt zufälligen User-Agent aus Pool
   */
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Generiert zufällige Verzögerung zwischen min und max
   */
  async randomDelay() {
    const delay = Math.floor(Math.random() * (this.options.maxDelay - this.options.minDelay + 1)) + this.options.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Parst Preis aus Text mit Regex
   */
  parsePrice(text, currency = '€') {
    if (!text) return null;
    
    // Remove alle non-numeric characters außer Punkt und Komma
    const cleanText = text.replace(/[^\d,\.]/g, '');
    
    // Verschiedene Preisformate erkennen
    const patterns = [
      /(\d{1,3}(?:\.\d{3})*),(\d{2})/, // Deutsch: 1.234,56
      /(\d{1,3}(?:,\d{3})*\.(\d{2}))/, // English: 1,234.56
      /(\d+[,\.]\d{1,2})/, // Einfacher Preis: 123,45 oder 123.45
      /(\d+)/ // Nur Ganzzahlen
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let priceStr = match[0];
        // Deutsch format zu float konvertieren
        if (priceStr.includes(',') && priceStr.lastIndexOf(',') > priceStr.lastIndexOf('.')) {
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else if (priceStr.includes(',') && !priceStr.includes('.')) {
          priceStr = priceStr.replace(',', '.');
        }
        
        const price = parseFloat(priceStr);
        return isNaN(price) ? null : { price, currency };
      }
    }
    
    return null;
  }

  /**
   * Bestimmt Verfügbarkeitsstatus aus Text
   */
  parseAvailability(text) {
    if (!text) return 'unknown';
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('in stock') || 
        lowerText.includes('verfügbar') || 
        lowerText.includes('lieferbar') ||
        lowerText.includes('sofort') ||
        lowerText.includes('green') ||
        /\d+\s*(stk|pcs|pieces|stück)/.test(lowerText)) {
      return 'in-stock';
    }
    
    if (lowerText.includes('out of stock') || 
        lowerText.includes('nicht verfügbar') ||
        lowerText.includes('ausverkauft') ||
        lowerText.includes('nicht lieferbar')) {
      return 'out-of-stock';
    }
    
    if (lowerText.includes('low stock') ||
        lowerText.includes('wenige') ||
        lowerText.includes('begrenzt')) {
      return 'low-stock';
    }
    
    return 'unknown';
  }

  /**
   * Scrapt Preis von einer spezifischen URL mit Retry-Logic
   */
  async scrapePrice(url, productKey, attempt = 1) {
    try {
      console.log(`[PriceScraper] Scraping ${url} (attempt ${attempt})`);
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Anti-Bot Headers setzen
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Random delay vor dem Laden
      await this.randomDelay();

      // Seite laden mit Timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: this.options.timeout 
      });

      // Domain-spezifische Selektoren abrufen
      const domain = this.extractDomain(url);
      const selectors = SITE_SELECTORS[domain];

      if (!selectors) {
        throw new ScrapingError('No selectors configured for domain', 'UNSUPPORTED_DOMAIN', { domain });
      }

      let priceInfo = null;
      let availabilityStatus = 'unknown';

      // Preis scrapen
      for (const selector of selectors.price) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          const element = await page.$(selector);
          if (element) {
            const text = await element.evaluate(el => el.textContent?.trim());
            priceInfo = this.parsePrice(text, selectors.currency);
            if (priceInfo) break;
          }
        } catch (selectorError) {
          // Selector nicht gefunden, nächsten versuchen
          continue;
        }
      }

      // Verfügbarkeit scrapen
      for (const selector of selectors.availability) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await element.evaluate(el => el.textContent?.trim());
            const status = this.parseAvailability(text);
            if (status !== 'unknown') {
              availabilityStatus = status;
              break;
            }
          }
        } catch (selectorError) {
          // Selector nicht gefunden, nächsten versuchen
          continue;
        }
      }

      // Fallback: Gesamte Seite nach Preisen durchsuchen
      if (!priceInfo) {
        const pageText = await page.evaluate(() => document.body.textContent);
        const priceMatches = pageText.match(selectors.fallbackPrice);
        if (priceMatches) {
          priceInfo = this.parsePrice(priceMatches[0], selectors.currency);
        }
      }

      await page.close();

      // Erfolgreiches Ergebnis
      if (priceInfo) {
        return {
          success: true,
          price: priceInfo.price,
          currency: priceInfo.currency,
          availability: availabilityStatus,
          timestamp: new Date().toISOString(),
          url,
          productKey,
          scrapedAt: new Date()
        };
      } else {
        throw new ScrapingError('No price found on page', 'PRICE_NOT_FOUND', { url });
      }

    } catch (error) {
      console.error(`[PriceScraper] Error scraping ${url}:`, error.message);
      
      // Retry Logic mit exponential backoff
      if (attempt < this.options.maxRetries) {
        const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`[PriceScraper] Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.scrapePrice(url, productKey, attempt + 1);
      }
      
      // Structured error nach max retries
      return {
        success: false,
        error: error instanceof ScrapingError ? error : new ScrapingError(error.message, 'SCRAPING_FAILED'),
        url,
        productKey,
        timestamp: new Date().toISOString(),
        attempts: attempt
      };
    }
  }

  /**
   * Scrapt Preise für ein spezifisches Produkt
   */
  async scrapePriceForProduct(productKey) {
    const product = PARTS[productKey];
    if (!product) {
      throw new ScrapingError('Product not found', 'PRODUCT_NOT_FOUND', { productKey });
    }

    if (!product.link || product.link === '#') {
      return {
        success: false,
        error: new ScrapingError('No valid URL for product', 'NO_URL', { productKey }),
        productKey,
        timestamp: new Date().toISOString()
      };
    }

    return this.scrapePrice(product.link, productKey);
  }

  /**
   * Scrapt alle Produktpreise parallel (mit Begrenzung)
   */
  async scrapeAllPrices(concurrentLimit = 3) {
    const productKeys = Object.keys(PARTS);
    const results = [];
    
    console.log(`[PriceScraper] Starting bulk scraping for ${productKeys.length} products...`);

    // Parallel scraping mit Begrenzung
    for (let i = 0; i < productKeys.length; i += concurrentLimit) {
      const batch = productKeys.slice(i, i + concurrentLimit);
      const batchPromises = batch.map(key => this.scrapePriceForProduct(key));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Verzögerung zwischen Batches
        if (i + concurrentLimit < productKeys.length) {
          await this.randomDelay();
        }
      } catch (error) {
        console.error('[PriceScraper] Batch error:', error);
        // Continue with individual scraping for failed batch
        for (const key of batch) {
          try {
            const result = await this.scrapePriceForProduct(key);
            results.push(result);
          } catch (individualError) {
            results.push({
              success: false,
              error: individualError,
              productKey: key,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    console.log(`[PriceScraper] Bulk scraping completed. Success: ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  }

  /**
   * Browser-Instanz schließen
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.browserPromise = null;
    }
  }

  /**
   * Destructor für automatisches Cleanup
   */
  async [Symbol.asyncDispose]() {
    await this.close();
  }
}

// Convenience Functions für Export

/**
 * Scrapt Preis für ein einzelnes Produkt
 */
export async function scrapePriceForProduct(productKey, options = {}) {
  const scraper = new PriceScraper(options);
  try {
    return await scraper.scrapePriceForProduct(productKey);
  } finally {
    await scraper.close();
  }
}

/**
 * Scrapt alle Produktpreise
 */
export async function scrapeAllPrices(options = {}) {
  const scraper = new PriceScraper(options);
  try {
    return await scraper.scrapeAllPrices(options.concurrentLimit);
  } finally {
    await scraper.close();
  }
}

/**
 * Hauptklasse exportieren
 */
export { PriceScraper, ScrapingError };

/**
 * Default Export für einfache Nutzung
 */
export default PriceScraper;