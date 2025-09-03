/**
 * Currency Service for DIY Humanoid Configurator
 * Provides real-time exchange rates and currency conversion
 */

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR';
const FALLBACK_API_URL = 'https://api.exchangerate.host/latest?base=EUR';

// Currency mapping based on language/region
export const CURRENCY_MAPPING = {
  'de': { code: 'EUR', symbol: '€', locale: 'de-DE' },
  'en': { code: 'GBP', symbol: '£', locale: 'en-GB' },
  'nl': { code: 'EUR', symbol: '€', locale: 'nl-NL' },
  'th': { code: 'THB', symbol: '฿', locale: 'th-TH' }
};

export const DEFAULT_CURRENCY = { code: 'EUR', symbol: '€', locale: 'de-DE' };

/**
 * Currency Service Class
 */
class CurrencyServiceClass {
  constructor() {
    this.rates = null;
    this.lastUpdate = null;
    this.cacheKey = 'currency_rates_cache';
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Load cached rates on initialization
    this.loadCachedRates();
  }

  /**
   * Load cached rates from localStorage
   */
  loadCachedRates() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const { rates, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (within TTL)
        if (now - timestamp < this.cacheTTL) {
          this.rates = rates;
          this.lastUpdate = new Date(timestamp);
          console.log('💰 Currency rates loaded from cache');
          return true;
        }
      }
    } catch (error) {
      console.warn('💰 Error loading cached currency rates:', error);
    }
    return false;
  }

  /**
   * Save rates to localStorage cache
   */
  saveCachedRates(rates) {
    try {
      const cacheData = {
        rates,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('💰 Currency rates cached successfully');
    } catch (error) {
      console.warn('💰 Error caching currency rates:', error);
    }
  }

  /**
   * Fetch fresh exchange rates from API
   */
  async fetchRates() {
    const apis = [
      { url: EXCHANGE_RATE_API_URL, name: 'ExchangeRate-API' },
      { url: FALLBACK_API_URL, name: 'ExchangeRate.host' }
    ];

    for (const api of apis) {
      try {
        console.log(`💰 Fetching rates from ${api.name}...`);
        const response = await fetch(api.url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Normalize response format (different APIs have slightly different structures)
        const rates = data.rates || data.data?.rates || {};
        
        if (!rates || Object.keys(rates).length === 0) {
          throw new Error('No rates data received');
        }
        
        // Ensure EUR is always 1.0 (base currency)
        if (!rates.EUR) {
          rates.EUR = 1.0;
        }
        
        console.log(`💰 Successfully fetched ${Object.keys(rates).length} exchange rates from ${api.name}`);
        
        this.rates = rates;
        this.lastUpdate = new Date();
        this.saveCachedRates(rates);
        
        return rates;
        
      } catch (error) {
        console.warn(`💰 Failed to fetch from ${api.name}:`, error.message);
        continue;
      }
    }
    
    throw new Error('All currency APIs failed');
  }

  /**
   * Get exchange rates (cached or fresh)
   */
  async getRates() {
    // Return cached rates if available and fresh
    if (this.rates && this.lastUpdate) {
      const now = new Date();
      const timeSinceUpdate = now - this.lastUpdate;
      
      if (timeSinceUpdate < this.cacheTTL) {
        return this.rates;
      }
    }
    
    // Fetch fresh rates
    try {
      return await this.fetchRates();
    } catch (error) {
      console.error('💰 Failed to fetch fresh rates:', error.message);
      
      // If we have cached rates, use them even if expired
      if (this.rates) {
        console.warn('💰 Using expired cached rates as fallback');
        return this.rates;
      }
      
      // Ultimate fallback: default rates
      console.warn('💰 Using default fallback rates');
      return this.getDefaultRates();
    }
  }

  /**
   * Get default fallback rates
   */
  getDefaultRates() {
    return {
      'EUR': 1.0,
      'GBP': 0.85,  // Approximate GBP/EUR rate
      'THB': 37.0,  // Approximate THB/EUR rate
      'USD': 1.1    // Just in case
    };
  }

  /**
   * Convert amount from EUR to target currency
   */
  async convertFromEUR(amount, targetCurrency) {
    try {
      const rates = await this.getRates();
      const rate = rates[targetCurrency];
      
      if (!rate) {
        console.warn(`💰 No rate found for ${targetCurrency}, using EUR`);
        return amount;
      }
      
      return amount * rate;
    } catch (error) {
      console.error('💰 Conversion error:', error);
      return amount; // Fallback to original amount
    }
  }

  /**
   * Get currency info for a language code
   */
  getCurrencyForLanguage(languageCode) {
    return CURRENCY_MAPPING[languageCode] || DEFAULT_CURRENCY;
  }

  /**
   * Format amount in the appropriate currency for a language
   */
  async formatCurrency(amount, languageCode) {
    const currencyInfo = this.getCurrencyForLanguage(languageCode);
    
    try {
      // Convert from EUR to target currency
      const convertedAmount = await this.convertFromEUR(amount, currencyInfo.code);
      
      // Format using Intl.NumberFormat
      return new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency',
        currency: currencyInfo.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(convertedAmount);
      
    } catch (error) {
      console.error('💰 Formatting error:', error);
      // Fallback to EUR formatting
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    }
  }

  /**
   * Get current exchange rate for a currency
   */
  async getRate(currencyCode) {
    try {
      const rates = await this.getRates();
      return rates[currencyCode] || 1.0;
    } catch (error) {
      console.error('💰 Error getting rate:', error);
      return 1.0;
    }
  }

  /**
   * Force refresh rates (bypass cache)
   */
  async refreshRates() {
    console.log('💰 Force refreshing currency rates...');
    this.rates = null;
    this.lastUpdate = null;
    return await this.fetchRates();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    if (!this.rates || !this.lastUpdate) {
      return { cached: false, age: null };
    }
    
    const age = Date.now() - this.lastUpdate.getTime();
    const hoursOld = Math.floor(age / (1000 * 60 * 60));
    
    return {
      cached: true,
      age: hoursOld,
      lastUpdate: this.lastUpdate.toISOString(),
      ratesCount: Object.keys(this.rates).length
    };
  }
}

// Export singleton instance
export const currencyService = new CurrencyServiceClass();
export default currencyService;