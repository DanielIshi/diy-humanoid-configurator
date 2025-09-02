import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Performance Monitoring Hook
export function usePerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    // Performance Observer für Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'navigation':
              setMetrics(prev => ({
                ...prev,
                loadTime: entry.loadEventEnd - entry.loadEventStart
              }));
              break;
            case 'measure':
              if (entry.name === 'render-time') {
                setMetrics(prev => ({
                  ...prev,
                  renderTime: entry.duration
                }));
              }
              break;
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'measure', 'paint'] });
      
      return () => observer.disconnect();
    }
  }, []);

  // Memory Usage Tracking
  useEffect(() => {
    const trackMemory = () => {
      if ('memory' in performance) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: performance.memory.usedJSHeapSize / 1048576 // MB
        }));
      }
    };

    const interval = setInterval(trackMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
}

// Debounced Value Hook für Performance-kritische Inputs
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttled Callback Hook
export function useThrottle(callback, delay) {
  const lastCall = useRef(0);
  
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }
  }, [callback, delay]);
}

// Virtual Scrolling Hook
export function useVirtualScroll(items, containerHeight, itemHeight) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      start: visibleStart,
      end: visibleEnd,
      items: items.slice(visibleStart, visibleEnd),
      totalHeight: items.length * itemHeight,
      offsetY: visibleStart * itemHeight
    };
  }, [items, scrollTop, containerHeight, itemHeight]);

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    onScroll,
    scrollTop
  };
}

// Image Lazy Loading Hook
export function useLazyImage(src, options = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef();

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const image = new Image();
          image.onload = () => {
            setImageSrc(src);
            setLoading(false);
          };
          image.onerror = (err) => {
            setError(err);
            setLoading(false);
          };
          image.src = src;
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { loading, error, src: imageSrc, ref: imgRef };
}

// Performance Budget Hook
export function usePerformanceBudget(budget = {}) {
  const [violations, setViolations] = useState([]);

  useEffect(() => {
    const checkBudget = () => {
      const newViolations = [];

      // Check bundle size
      if (budget.bundleSize && performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const totalSize = resources.reduce((sum, resource) => {
          return sum + (resource.transferSize || 0);
        }, 0);

        if (totalSize > budget.bundleSize) {
          newViolations.push({
            type: 'bundle-size',
            actual: totalSize,
            budget: budget.bundleSize
          });
        }
      }

      // Check First Contentful Paint
      if (budget.fcp && 'PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint' && entry.startTime > budget.fcp) {
              newViolations.push({
                type: 'first-contentful-paint',
                actual: entry.startTime,
                budget: budget.fcp
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['paint'] });
      }

      setViolations(newViolations);
    };

    const timeout = setTimeout(checkBudget, 1000);
    return () => clearTimeout(timeout);
  }, [budget]);

  return violations;
}