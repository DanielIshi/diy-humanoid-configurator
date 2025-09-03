/**
 * Test Script für PriceScraper Engine
 * Testet einzelne Produkte und die gesamte Scraping-Funktionalität
 */

import { PriceScraper, scrapePriceForProduct, scrapeAllPrices } from './price-scraper.js';
import { PARTS } from '../data/products.js';

/**
 * Test für einzelnes Produkt
 */
async function testSingleProduct(productKey) {
  console.log(`\n=== Testing Single Product: ${productKey} ===`);
  
  const product = PARTS[productKey];
  if (!product) {
    console.log(`❌ Product ${productKey} not found`);
    return;
  }
  
  console.log(`Product: ${product.name}`);
  console.log(`URL: ${product.link}`);
  console.log(`Supplier: ${product.supplier}`);
  console.log(`Current Price: €${product.price}`);
  
  try {
    const result = await scrapePriceForProduct(productKey, { headless: true });
    
    if (result.success) {
      console.log(`✅ Scraping successful!`);
      console.log(`Scraped Price: ${result.currency}${result.price}`);
      console.log(`Availability: ${result.availability}`);
      console.log(`Timestamp: ${result.timestamp}`);
      
      // Preisvergleich
      const priceDiff = Math.abs(result.price - product.price);
      const diffPercent = (priceDiff / product.price) * 100;
      console.log(`Price Difference: €${priceDiff.toFixed(2)} (${diffPercent.toFixed(1)}%)`);
    } else {
      console.log(`❌ Scraping failed:`);
      console.log(`Error: ${result.error.message}`);
      console.log(`Code: ${result.error.code}`);
      console.log(`Attempts: ${result.attempts || 1}`);
    }
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
  }
}

/**
 * Test für mehrere Produkte
 */
async function testMultipleProducts(productKeys, concurrent = 2) {
  console.log(`\n=== Testing Multiple Products (${productKeys.length} products, ${concurrent} concurrent) ===`);
  
  const scraper = new PriceScraper({ 
    headless: true,
    timeout: 10000,
    maxRetries: 2
  });
  
  try {
    const results = [];
    
    // Batch processing
    for (let i = 0; i < productKeys.length; i += concurrent) {
      const batch = productKeys.slice(i, i + concurrent);
      console.log(`\nProcessing batch ${Math.floor(i/concurrent) + 1}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(async (key) => {
        try {
          const result = await scraper.scrapePriceForProduct(key);
          return { key, ...result };
        } catch (error) {
          return { 
            key, 
            success: false, 
            error: { message: error.message, code: 'TEST_ERROR' } 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Zeige Batch-Ergebnisse
      batchResults.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.key}: ${result.currency}${result.price} (${result.availability})`);
        } else {
          console.log(`  ❌ ${result.key}: ${result.error.code} - ${result.error.message}`);
        }
      });
      
      // Delay zwischen Batches
      if (i + concurrent < productKeys.length) {
        console.log('  Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`\n📊 Summary:`);
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful} (${(successful/results.length*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${(failed/results.length*100).toFixed(1)}%)`);
    
    if (successful > 0) {
      console.log(`\n💰 Price Summary:`);
      results.filter(r => r.success).forEach(result => {
        const product = PARTS[result.key];
        const diff = result.price - product.price;
        const diffSymbol = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
        console.log(`  ${result.key}: ${result.currency}${result.price} ${diffSymbol} (was €${product.price})`);
      });
    }
    
    return results;
    
  } finally {
    await scraper.close();
  }
}

/**
 * Test für alle Produkte (vorsichtig!)
 */
async function testAllProducts() {
  console.log(`\n=== Testing ALL Products (${Object.keys(PARTS).length} products) ===`);
  console.log('⚠️  This will take a while and make many requests. Use carefully!');
  
  try {
    const results = await scrapeAllPrices({ 
      headless: true, 
      concurrentLimit: 2,
      timeout: 10000,
      maxRetries: 2
    });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`\n📊 Final Summary:`);
    console.log(`Total products: ${results.length}`);
    console.log(`Successfully scraped: ${successful}`);
    console.log(`Failed to scrape: ${failed}`);
    console.log(`Success rate: ${(successful/results.length*100).toFixed(1)}%`);
    
    // Error analysis
    if (failed > 0) {
      console.log(`\n❌ Failed products:`);
      results.filter(r => !r.success).forEach(result => {
        console.log(`  ${result.productKey}: ${result.error?.code} - ${result.error?.message}`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.log(`❌ Bulk test failed: ${error.message}`);
  }
}

/**
 * Performance Test
 */
async function performanceTest() {
  console.log(`\n=== Performance Test ===`);
  
  const testProducts = ['MG996R', 'ARD_MEGA', 'MPU6050']; // Verschiedene Domains
  const startTime = Date.now();
  
  try {
    const results = await testMultipleProducts(testProducts, 1); // Sequential
    const duration = Date.now() - startTime;
    
    console.log(`\n⏱️  Performance Results:`);
    console.log(`Duration: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.log(`Average per product: ${(duration/testProducts.length).toFixed(0)}ms`);
    console.log(`Products per minute: ${(testProducts.length * 60000 / duration).toFixed(1)}`);
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log('🚀 PriceScraper Test Suite Started');
  console.log('=====================================');
  
  try {
    // Test 1: Einzelnes Produkt (einfacher Fall)
    await testSingleProduct('MG996R');
    
    // Test 2: Mehrere Produkte (verschiedene Domains)
    const sampleProducts = ['MG996R', 'DS3218', 'ARD_MEGA', 'MPU6050'];
    await testMultipleProducts(sampleProducts, 2);
    
    // Test 3: Performance Test
    await performanceTest();
    
    // Optional: Test 4: Alle Produkte (auskommentiert für Sicherheit)
    // await testAllProducts();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.log(`\n💥 Test suite failed: ${error.message}`);
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runTests();
  } else if (args[0] === 'single' && args[1]) {
    testSingleProduct(args[1]);
  } else if (args[0] === 'all') {
    testAllProducts();
  } else if (args[0] === 'performance') {
    performanceTest();
  } else {
    console.log('Usage:');
    console.log('  node test-scraper.js              # Run all tests');
    console.log('  node test-scraper.js single KEY   # Test single product');
    console.log('  node test-scraper.js all          # Test all products');
    console.log('  node test-scraper.js performance  # Performance test');
    console.log('');
    console.log('Available product keys:', Object.keys(PARTS).join(', '));
  }
}