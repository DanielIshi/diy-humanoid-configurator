import { Router } from 'express';
import { PriceScraper, scrapePriceForProduct, scrapeAllPrices } from '../scraper/price-scraper.js';
import { PARTS } from '../data/products.js';

const router = Router();

// Cache für Preise (einfacher In-Memory-Cache)
const priceCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 Minuten

/**
 * GET /prices - Alle aktuellen Preise abrufen
 */
router.get('/', async (req, res) => {
  try {
    const { refresh = 'false', products } = req.query;
    const forceRefresh = refresh === 'true';
    
    // Spezifische Produkte oder alle
    const productKeys = products ? products.split(',') : Object.keys(PARTS);
    
    const results = [];
    const toScrape = [];
    
    // Cache-Check
    for (const key of productKeys) {
      const cached = priceCache.get(key);
      
      if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        results.push(cached.data);
      } else {
        toScrape.push(key);
      }
    }
    
    // Neue Preise scrapen falls nötig
    if (toScrape.length > 0) {
      console.log(`[PricesAPI] Scraping ${toScrape.length} products...`);
      
      const scraper = new PriceScraper({ 
        headless: true, 
        timeout: 10000,
        maxRetries: 2
      });
      
      try {
        // Parallel scraping mit Begrenzung
        const scrapingPromises = toScrape.map(key => 
          scraper.scrapePriceForProduct(key).catch(error => ({
            success: false,
            productKey: key,
            error: { message: error.message, code: 'SCRAPING_ERROR' },
            timestamp: new Date().toISOString()
          }))
        );
        
        const scrapedResults = await Promise.all(scrapingPromises);
        
        // Ergebnisse verarbeiten und cachen
        for (const result of scrapedResults) {
          const product = PARTS[result.productKey];
          
          const priceData = {
            productKey: result.productKey,
            product: product ? {
              name: product.name,
              supplier: product.supplier,
              category: product.category,
              originalPrice: product.price,
              url: product.link
            } : null,
            success: result.success,
            scrapedPrice: result.success ? result.price : null,
            currency: result.success ? result.currency : null,
            availability: result.success ? result.availability : 'unknown',
            timestamp: result.timestamp,
            error: result.error || null,
            priceDifference: result.success && product ? 
              (result.price - product.price).toFixed(2) : null,
            priceChangePercent: result.success && product ? 
              (((result.price - product.price) / product.price) * 100).toFixed(1) : null
          };
          
          // Cache aktualisieren
          priceCache.set(result.productKey, {
            data: priceData,
            timestamp: Date.now()
          });
          
          results.push(priceData);
        }
      } finally {
        await scraper.close();
      }
    }
    
    // Response aufbauen
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    res.json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed,
        cached: results.length - toScrape.length,
        scraped: toScrape.length,
        successRate: results.length > 0 ? (successful / results.length * 100).toFixed(1) + '%' : '0%'
      },
      timestamp: new Date().toISOString(),
      data: results.sort((a, b) => a.productKey.localeCompare(b.productKey))
    });
    
  } catch (error) {
    console.error('[PricesAPI] Error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch prices',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /prices/:productKey - Einzelnen Produktpreis abrufen
 */
router.get('/:productKey', async (req, res) => {
  try {
    const { productKey } = req.params;
    const { refresh = 'false' } = req.query;
    const forceRefresh = refresh === 'true';
    
    const product = PARTS[productKey];
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Cache-Check
    const cached = priceCache.get(productKey);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json({
        success: true,
        cached: true,
        data: cached.data,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fresh scraping
    console.log(`[PricesAPI] Scraping single product: ${productKey}`);
    
    const result = await scrapePriceForProduct(productKey, {
      headless: true,
      timeout: 10000,
      maxRetries: 2
    });
    
    const priceData = {
      productKey,
      product: {
        name: product.name,
        supplier: product.supplier,
        category: product.category,
        originalPrice: product.price,
        url: product.link
      },
      success: result.success,
      scrapedPrice: result.success ? result.price : null,
      currency: result.success ? result.currency : null,
      availability: result.success ? result.availability : 'unknown',
      timestamp: result.timestamp,
      error: result.error || null,
      priceDifference: result.success ? 
        (result.price - product.price).toFixed(2) : null,
      priceChangePercent: result.success ? 
        (((result.price - product.price) / product.price) * 100).toFixed(1) : null
    };
    
    // Cache aktualisieren
    priceCache.set(productKey, {
      data: priceData,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      cached: false,
      data: priceData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[PricesAPI] Error for product ${req.params.productKey}:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch product price',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /prices/refresh - Cache löschen und alle Preise neu scrapen
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('[PricesAPI] Cache refresh requested');
    
    // Cache leeren
    priceCache.clear();
    
    // Alle Preise neu scrapen
    const results = await scrapeAllPrices({
      headless: true,
      concurrentLimit: 2,
      timeout: 10000,
      maxRetries: 2
    });
    
    // Ergebnisse verarbeiten und cachen
    const processedResults = results.map(result => {
      const product = PARTS[result.productKey];
      
      const priceData = {
        productKey: result.productKey,
        product: product ? {
          name: product.name,
          supplier: product.supplier,
          category: product.category,
          originalPrice: product.price,
          url: product.link
        } : null,
        success: result.success,
        scrapedPrice: result.success ? result.price : null,
        currency: result.success ? result.currency : null,
        availability: result.success ? result.availability : 'unknown',
        timestamp: result.timestamp,
        error: result.error || null,
        priceDifference: result.success && product ? 
          (result.price - product.price).toFixed(2) : null,
        priceChangePercent: result.success && product ? 
          (((result.price - product.price) / product.price) * 100).toFixed(1) : null
      };
      
      // Cache aktualisieren
      if (result.success) {
        priceCache.set(result.productKey, {
          data: priceData,
          timestamp: Date.now()
        });
      }
      
      return priceData;
    });
    
    const successful = processedResults.filter(r => r.success).length;
    const failed = processedResults.length - successful;
    
    res.json({
      success: true,
      message: 'Price refresh completed',
      summary: {
        total: processedResults.length,
        successful,
        failed,
        successRate: processedResults.length > 0 ? (successful / processedResults.length * 100).toFixed(1) + '%' : '0%'
      },
      timestamp: new Date().toISOString(),
      data: processedResults.sort((a, b) => a.productKey.localeCompare(b.productKey))
    });
    
  } catch (error) {
    console.error('[PricesAPI] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to refresh prices',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /prices/cache/status - Cache-Status abrufen
 */
router.get('/cache/status', (req, res) => {
  const cacheStats = {
    size: priceCache.size,
    ttl: CACHE_TTL,
    entries: []
  };
  
  for (const [key, value] of priceCache.entries()) {
    const age = Date.now() - value.timestamp;
    const remaining = Math.max(0, CACHE_TTL - age);
    
    cacheStats.entries.push({
      productKey: key,
      age: Math.floor(age / 1000),
      remaining: Math.floor(remaining / 1000),
      success: value.data.success
    });
  }
  
  res.json({
    success: true,
    cache: cacheStats,
    timestamp: new Date().toISOString()
  });
});

export default router;

