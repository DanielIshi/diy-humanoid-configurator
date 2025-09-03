import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import currencyService, { DEFAULT_CURRENCY } from '../services/currencyService';

/**
 * Custom hook for currency conversion and formatting
 * Automatically handles currency conversion based on current language
 */
export function useCurrency() {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rates, setRates] = useState(null);

  const currentLanguage = i18n.language || 'de';
  const currencyInfo = currencyService.getCurrencyForLanguage(currentLanguage);

  // Load rates on mount and language change
  useEffect(() => {
    loadRates();
  }, [currentLanguage]);

  const loadRates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const freshRates = await currencyService.getRates();
      setRates(freshRates);
    } catch (err) {
      setError(err.message);
      console.error('💰 Failed to load currency rates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Convert EUR amount to current language's currency
   */
  const convertAmount = useCallback(async (eurAmount) => {
    try {
      return await currencyService.convertFromEUR(eurAmount, currencyInfo.code);
    } catch (error) {
      console.error('💰 Conversion failed:', error);
      return eurAmount; // Fallback to EUR amount
    }
  }, [currencyInfo.code]);

  /**
   * Format amount in current language's currency
   */
  const formatCurrency = useCallback(async (eurAmount) => {
    try {
      return await currencyService.formatCurrency(eurAmount, currentLanguage);
    } catch (error) {
      console.error('💰 Formatting failed:', error);
      // Fallback formatting
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(eurAmount);
    }
  }, [currentLanguage]);

  /**
   * Synchronous format using cached rates (faster for UI)
   */
  const formatCurrencySync = useCallback((eurAmount) => {
    try {
      if (!rates || !rates[currencyInfo.code]) {
        // Fallback to EUR
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(eurAmount);
      }

      const convertedAmount = eurAmount * rates[currencyInfo.code];
      
      return new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency',
        currency: currencyInfo.code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(convertedAmount);
      
    } catch (error) {
      console.error('💰 Sync formatting failed:', error);
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(eurAmount);
    }
  }, [rates, currencyInfo]);

  /**
   * Get current exchange rate
   */
  const getCurrentRate = useCallback(() => {
    if (!rates || !rates[currencyInfo.code]) {
      return 1.0;
    }
    return rates[currencyInfo.code];
  }, [rates, currencyInfo.code]);

  /**
   * Refresh rates manually
   */
  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const freshRates = await currencyService.refreshRates();
      setRates(freshRates);
    } catch (err) {
      setError(err.message);
      console.error('💰 Failed to refresh rates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get currency symbol for current language
   */
  const getCurrencySymbol = useCallback(() => {
    return currencyInfo.symbol;
  }, [currencyInfo.symbol]);

  /**
   * Get currency code for current language
   */
  const getCurrencyCode = useCallback(() => {
    return currencyInfo.code;
  }, [currencyInfo.code]);

  /**
   * Check if rates are available and fresh
   */
  const isRatesAvailable = useCallback(() => {
    return rates && Object.keys(rates).length > 0;
  }, [rates]);

  return {
    // State
    isLoading,
    error,
    rates,
    currencyInfo,
    currentLanguage,

    // Functions
    convertAmount,
    formatCurrency,
    formatCurrencySync,
    getCurrentRate,
    getCurrencySymbol,
    getCurrencyCode,
    refreshRates,
    isRatesAvailable,

    // Cache info
    cacheStatus: currencyService.getCacheStatus()
  };
}

export default useCurrency;