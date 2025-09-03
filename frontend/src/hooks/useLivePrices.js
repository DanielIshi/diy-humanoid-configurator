import { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_BASE_URL = 'http://localhost:3001';
const CACHE_DURATION = 15 * 60 * 1000; // 15 Minuten
const STALE_WARNING_TIME = 60 * 60 * 1000; // 60 Minuten

export function useLivePrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  // Fetche alle Preise vom Backend
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/prices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // Timeout nach 10 Sekunden
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Konvertiere API-Datenformat zu Hook-Format
        const pricesMap = {};
        data.data.forEach(item => {
          if (item.success && item.scrapedPrice !== null) {
            pricesMap[item.productKey] = {
              price: item.scrapedPrice,
              lastUpdated: item.timestamp,
              source: item.product.supplier || 'unknown',
              currency: item.currency || 'EUR',
              priceDifference: item.priceDifference,
              priceChangePercent: item.priceChangePercent
            };
          }
        });
        
        setPrices(pricesMap);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Unbekannter Fehler beim Laden der Preise');
      }
    } catch (err) {
      console.warn('[useLivePrices] Fehler beim Fetchen der Preise:', err.message);
      setError(err.message);
      
      // Bei Netzwerkfehlern: Cache behalten aber als "stale" markieren
      if (err.name === 'AbortError' || err.name === 'TypeError') {
        setError('Netzwerkfehler - verwende gecachte Preise');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Einzelnen Preis fetchen (falls nötig)
  const fetchPriceForProduct = useCallback(async (productKey) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/prices/${encodeURIComponent(productKey)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.price !== undefined) {
        setPrices(prev => ({
          ...prev,
          [productKey]: {
            price: data.price,
            lastUpdated: new Date().toISOString(),
            source: data.source || 'unknown'
          }
        }));
        return data.price;
      }
      
      return null;
    } catch (err) {
      console.warn(`[useLivePrices] Fehler beim Fetchen von ${productKey}:`, err.message);
      return null;
    }
  }, []);

  // Cache Status prüfen
  const getCacheStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/prices/cache/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (err) {
      console.warn('[useLivePrices] Cache Status nicht verfügbar:', err.message);
    }
    return null;
  }, []);

  // Manueller Refresh
  const refresh = useCallback(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Hilfsfunktionen
  const getLivePrice = useCallback((productKey) => {
    const priceData = prices[productKey];
    return priceData?.price || null;
  }, [prices]);

  const getLastUpdatedTime = useCallback((productKey) => {
    const priceData = prices[productKey];
    if (!priceData?.lastUpdated) return null;
    
    try {
      return new Date(priceData.lastUpdated);
    } catch {
      return null;
    }
  }, [prices]);

  const isStale = useCallback((productKey) => {
    const lastUpdate = getLastUpdatedTime(productKey);
    if (!lastUpdate) return true;
    
    return Date.now() - lastUpdate.getTime() > STALE_WARNING_TIME;
  }, [getLastUpdatedTime]);

  const getPriceSource = useCallback((productKey) => {
    return prices[productKey]?.source || null;
  }, [prices]);

  const getTimeSinceUpdate = useCallback((productKey) => {
    const lastUpdate = getLastUpdatedTime(productKey);
    if (!lastUpdate) return null;
    
    const diffMs = Date.now() - lastUpdate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `vor ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays}d`;
  }, [getLastUpdatedTime]);

  // Setup Auto-Refresh
  useEffect(() => {
    // Initial Fetch
    fetchPrices();

    // Setup Interval für Auto-Refresh
    intervalRef.current = setInterval(() => {
      fetchPrices();
    }, CACHE_DURATION);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Haupt-State
    prices,
    loading,
    error,
    lastUpdated,
    
    // Actions
    refresh,
    fetchPriceForProduct,
    getCacheStatus,
    
    // Hilfsfunktionen
    getLivePrice,
    getLastUpdatedTime,
    isStale,
    getPriceSource,
    getTimeSinceUpdate,
    
    // Computed Values
    hasLivePrices: Object.keys(prices).length > 0,
    isOnline: !error || (error && Object.keys(prices).length > 0)
  };
}

export default useLivePrices;