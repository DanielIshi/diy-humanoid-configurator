// Real User Monitoring (RUM) System
class PerformanceMonitoring {
  constructor() {
    this.metrics = {
      navigation: {},
      vitals: {},
      resources: [],
      userInteractions: [],
      errors: []
    };
    
    this.config = {
      apiEndpoint: '/api/metrics',
      sampleRate: 1.0, // 100% sampling in development, reduce in production
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      bufferSize: 50
    };
    
    this.metricBuffer = [];
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Web Vitals Monitoring
    this.observeWebVitals();
    
    // Navigation Timing
    this.observeNavigation();
    
    // Resource Performance
    this.observeResources();
    
    // User Interactions
    this.observeUserInteractions();
    
    // JavaScript Errors
    this.observeErrors();
    
    // Memory Usage
    this.observeMemoryUsage();
    
    // Send metrics periodically
    this.startPeriodicReporting();
  }

  observeWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.vitals.lcp = {
        value: lastEntry.startTime,
        rating: this.getRating(lastEntry.startTime, [2500, 4000]),
        timestamp: Date.now()
      };
      
      this.logMetric('LCP', lastEntry.startTime, 'ms');
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        this.metrics.vitals.fid = {
          value: entry.processingStart - entry.startTime,
          rating: this.getRating(entry.processingStart - entry.startTime, [100, 300]),
          timestamp: Date.now()
        };
        
        this.logMetric('FID', entry.processingStart - entry.startTime, 'ms');
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    let clsEntries = [];
    
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = clsEntries[0];
          const lastSessionEntry = clsEntries[clsEntries.length - 1];
          
          if (entry.startTime - lastSessionEntry?.startTime < 1000 &&
              entry.startTime - firstSessionEntry?.startTime < 5000) {
            clsValue += entry.value;
            clsEntries.push(entry);
          } else {
            clsValue = entry.value;
            clsEntries = [entry];
          }
          
          this.metrics.vitals.cls = {
            value: clsValue,
            rating: this.getRating(clsValue, [0.1, 0.25]),
            timestamp: Date.now()
          };
          
          this.logMetric('CLS', clsValue);
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });

    // First Contentful Paint (FCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.vitals.fcp = {
            value: entry.startTime,
            rating: this.getRating(entry.startTime, [1800, 3000]),
            timestamp: Date.now()
          };
          
          this.logMetric('FCP', entry.startTime, 'ms');
        }
      });
    }).observe({ entryTypes: ['paint'] });
  }

  observeNavigation() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        this.metrics.navigation = {
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          ssl: entry.secureConnectionStart > 0 ? 
               entry.connectEnd - entry.secureConnectionStart : 0,
          ttfb: entry.responseStart - entry.fetchStart,
          download: entry.responseEnd - entry.responseStart,
          domParse: entry.domContentLoadedEventStart - entry.responseEnd,
          domReady: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          load: entry.loadEventEnd - entry.loadEventStart,
          total: entry.loadEventEnd - entry.fetchStart,
          timestamp: Date.now()
        };
        
        this.logMetric('Navigation Total', this.metrics.navigation.total, 'ms');
      });
    }).observe({ entryTypes: ['navigation'] });
  }

  observeResources() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        // Skip data URLs and very small resources
        if (entry.name.startsWith('data:') || entry.transferSize < 1000) return;
        
        const resource = {
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize || entry.encodedBodySize || 0,
          duration: entry.duration,
          blocked: entry.domainLookupStart - entry.fetchStart,
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          request: entry.responseStart - entry.requestStart,
          response: entry.responseEnd - entry.responseStart,
          timestamp: Date.now()
        };
        
        this.metrics.resources.push(resource);
        
        // Log slow resources
        if (resource.duration > 1000) {
          this.logMetric(`Slow ${resource.type}`, resource.duration, 'ms', resource.name);
        }
      });
    }).observe({ entryTypes: ['resource'] });
  }

  observeUserInteractions() {
    // Track long tasks that could affect responsiveness
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          this.metrics.userInteractions.push({
            type: 'long-task',
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
          
          this.logMetric('Long Task', entry.duration, 'ms');
        });
      }).observe({ entryTypes: ['longtask'] });
    }

    // Track user clicks and interactions
    ['click', 'scroll', 'keydown'].forEach(eventType => {
      let lastEventTime = 0;
      
      document.addEventListener(eventType, (event) => {
        const now = Date.now();
        
        // Throttle events to avoid spam
        if (now - lastEventTime < 100) return;
        lastEventTime = now;
        
        this.metrics.userInteractions.push({
          type: eventType,
          target: event.target.tagName,
          timestamp: now
        });
      }, { passive: true });
    });
  }

  observeErrors() {
    // JavaScript Errors
    window.addEventListener('error', (event) => {
      this.metrics.errors.push({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
      
      console.error('JavaScript Error:', event.message);
    });

    // Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors.push({
        type: 'promise-rejection',
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
      
      console.error('Unhandled Promise Rejection:', event.reason);
    });
  }

  observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const memoryInfo = {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
          timestamp: Date.now()
        };
        
        // Only log if significant change or every minute
        const lastMemory = this.metrics.vitals.memory;
        if (!lastMemory || Math.abs(memoryInfo.used - lastMemory.used) > 5 ||
            Date.now() - lastMemory.timestamp > 60000) {
          this.metrics.vitals.memory = memoryInfo;
          this.logMetric('Memory Usage', memoryInfo.used, 'MB');
        }
      }, 10000); // Check every 10 seconds
    }
  }

  getRating(value, thresholds) {
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  }

  logMetric(name, value, unit = '', url = '') {
    if (!this.config.enableConsoleLogging) return;
    
    const rating = name.includes('CLS') ? 
      this.getRating(value, [0.1, 0.25]) :
      this.getRating(value, [1000, 3000]);
    
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    const urlInfo = url ? ` (${url})` : '';
    
    console.log(`${emoji} ${name}: ${value}${unit}${urlInfo}`);
  }

  // Send metrics to backend
  sendMetrics(metrics) {
    if (Math.random() > this.config.sampleRate) return;
    
    fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics,
        session: this.getSessionId(),
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    }).catch(error => {
      console.error('Failed to send metrics:', error);
    });
  }

  startPeriodicReporting() {
    // Send metrics every 30 seconds
    setInterval(() => {
      const metricsSnapshot = JSON.parse(JSON.stringify(this.metrics));
      
      // Only send if we have meaningful data
      if (Object.keys(metricsSnapshot.vitals).length > 0 ||
          metricsSnapshot.resources.length > 0 ||
          metricsSnapshot.errors.length > 0) {
        this.sendMetrics(metricsSnapshot);
        
        // Clear sent metrics to avoid duplication
        this.metrics.resources = [];
        this.metrics.userInteractions = [];
        this.metrics.errors = [];
      }
    }, 30000);

    // Send final metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics(this.metrics);
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('performanceSessionId');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('performanceSessionId', sessionId);
    }
    return sessionId;
  }

  // Public API
  getMetrics() {
    return this.metrics;
  }

  // Custom timing marks
  mark(name) {
    if ('performance' in window && performance.mark) {
      performance.mark(name);
    }
  }

  // Custom timing measurements
  measure(name, startMark, endMark = null) {
    if ('performance' in window && performance.measure) {
      const measureName = endMark ? 
        performance.measure(name, startMark, endMark) :
        performance.measure(name, startMark);
      
      const entry = performance.getEntriesByName(name, 'measure')[0];
      if (entry) {
        this.logMetric(`Custom: ${name}`, entry.duration, 'ms');
        return entry.duration;
      }
    }
    return 0;
  }

  // Performance Budget Checker
  checkPerformanceBudget() {
    const budget = {
      fcp: 1500,
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      totalBundleSize: 300 * 1024, // 300KB
      imageSize: 100 * 1024 // 100KB per image
    };

    const violations = [];
    const metrics = this.metrics;

    // Check Web Vitals
    if (metrics.vitals.fcp && metrics.vitals.fcp.value > budget.fcp) {
      violations.push({
        metric: 'First Contentful Paint',
        actual: metrics.vitals.fcp.value,
        budget: budget.fcp,
        severity: 'high'
      });
    }

    if (metrics.vitals.lcp && metrics.vitals.lcp.value > budget.lcp) {
      violations.push({
        metric: 'Largest Contentful Paint',
        actual: metrics.vitals.lcp.value,
        budget: budget.lcp,
        severity: 'high'
      });
    }

    // Check Bundle Size
    const scriptResources = metrics.resources.filter(r => r.type === 'script');
    const totalScriptSize = scriptResources.reduce((sum, r) => sum + r.size, 0);
    
    if (totalScriptSize > budget.totalBundleSize) {
      violations.push({
        metric: 'Total Bundle Size',
        actual: Math.round(totalScriptSize / 1024),
        budget: Math.round(budget.totalBundleSize / 1024),
        severity: 'medium'
      });
    }

    return violations;
  }
}

// Initialize monitoring
const performanceMonitoring = new PerformanceMonitoring();

// Export for use in components
export { performanceMonitoring };
export default performanceMonitoring;