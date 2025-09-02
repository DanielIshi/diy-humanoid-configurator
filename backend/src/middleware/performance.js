import compression from 'compression';

// Performance Metrics Sammlung
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowQueries: [],
      memoryUsage: {
        current: 0,
        peak: 0,
        samples: []
      },
      routes: new Map()
    };
    
    this.startMemoryMonitoring();
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const currentMB = Math.round(usage.rss / 1024 / 1024);
      
      this.metrics.memoryUsage.current = currentMB;
      this.metrics.memoryUsage.peak = Math.max(
        this.metrics.memoryUsage.peak, 
        currentMB
      );
      
      // Keep last 100 samples
      this.metrics.memoryUsage.samples.push({
        timestamp: Date.now(),
        rss: currentMB,
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024)
      });
      
      if (this.metrics.memoryUsage.samples.length > 100) {
        this.metrics.memoryUsage.samples.shift();
      }
    }, 10000); // Every 10 seconds
  }

  recordRequest(route, method, responseTime, statusCode) {
    this.metrics.requests++;
    
    if (statusCode >= 400) {
      this.metrics.errors++;
    } else {
      this.metrics.responses++;
    }
    
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = 
      this.metrics.totalResponseTime / this.metrics.requests;
    
    // Route-specific metrics
    const routeKey = `${method} ${route}`;
    if (!this.metrics.routes.has(routeKey)) {
      this.metrics.routes.set(routeKey, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0
      });
    }
    
    const routeMetrics = this.metrics.routes.get(routeKey);
    routeMetrics.count++;
    routeMetrics.totalTime += responseTime;
    routeMetrics.averageTime = routeMetrics.totalTime / routeMetrics.count;
    routeMetrics.minTime = Math.min(routeMetrics.minTime, responseTime);
    routeMetrics.maxTime = Math.max(routeMetrics.maxTime, responseTime);
    
    if (statusCode >= 400) {
      routeMetrics.errors++;
    }
    
    // Track slow queries (>1000ms)
    if (responseTime > 1000) {
      this.metrics.slowQueries.push({
        route: routeKey,
        responseTime,
        timestamp: Date.now(),
        statusCode
      });
      
      // Keep only last 50 slow queries
      if (this.metrics.slowQueries.length > 50) {
        this.metrics.slowQueries.shift();
      }
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      routes: Object.fromEntries(this.metrics.routes),
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowQueries: [],
      memoryUsage: {
        ...this.metrics.memoryUsage,
        samples: this.metrics.memoryUsage.samples.slice(-10) // Keep last 10
      },
      routes: new Map()
    };
  }
}

const performanceMetrics = new PerformanceMetrics();

// Response Time Middleware
export function responseTimeMiddleware() {
  return (req, res, next) => {
    const startTime = process.hrtime();
    
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to ms
      
      // Add response time header
      res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);
      
      // Record metrics
      performanceMetrics.recordRequest(
        req.route?.path || req.path,
        req.method,
        responseTime,
        res.statusCode
      );
    });
    
    next();
  };
}

// Compression Middleware
export function compressionMiddleware() {
  return compression({
    level: 6, // Compression level (1-9)
    threshold: 1024, // Only compress if response > 1KB
    filter: (req, res) => {
      // Don't compress if no-transform directive is set
      if (req.headers['cache-control'] && 
          req.headers['cache-control'].includes('no-transform')) {
        return false;
      }
      
      // Use compression filter
      return compression.filter(req, res);
    }
  });
}

// Request Logging Middleware (Performance optimized)
export function performanceLoggingMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || 
        process.env.ENABLE_PERFORMANCE_LOGS === 'true') {
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Only log slow requests or errors in production
        if (process.env.NODE_ENV === 'production' && 
            duration < 500 && res.statusCode < 400) {
          return;
        }
        
        const logLevel = duration > 1000 ? 'warn' : 
                        res.statusCode >= 400 ? 'error' : 'info';
        
        console[logLevel](`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
      });
    }
    
    next();
  };
}

// Health Check Endpoint
export function createHealthCheckEndpoint(additionalChecks = []) {
  return async (req, res) => {
    const startTime = Date.now();
    
    try {
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: performanceMetrics.getMetrics(),
        checks: {}
      };
      
      // Run additional health checks
      for (const check of additionalChecks) {
        try {
          health.checks[check.name] = await check.check();
        } catch (error) {
          health.checks[check.name] = {
            status: 'error',
            error: error.message
          };
          health.status = 'unhealthy';
        }
      }
      
      // Performance check
      const responseTime = Date.now() - startTime;
      health.responseTime = responseTime;
      
      if (responseTime > 1000) {
        health.status = 'slow';
      }
      
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      });
    }
  };
}

// Performance Budget Middleware
export function performanceBudgetMiddleware(budget = {}) {
  const defaultBudget = {
    maxResponseTime: 1000, // 1 second
    maxMemoryUsage: 512, // 512 MB
    maxCpuUsage: 80, // 80%
    ...budget
  };
  
  return (req, res, next) => {
    const startTime = process.hrtime();
    
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      
      // Check performance budget violations
      const violations = [];
      
      if (responseTime > defaultBudget.maxResponseTime) {
        violations.push({
          type: 'response_time',
          actual: responseTime,
          budget: defaultBudget.maxResponseTime
        });
      }
      
      const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
      if (memoryUsage > defaultBudget.maxMemoryUsage) {
        violations.push({
          type: 'memory_usage',
          actual: memoryUsage,
          budget: defaultBudget.maxMemoryUsage
        });
      }
      
      // Log violations
      if (violations.length > 0) {
        console.warn('Performance budget violations:', {
          route: `${req.method} ${req.originalUrl}`,
          violations
        });
        
        // Add header for monitoring
        res.set('X-Performance-Budget-Violations', violations.length.toString());
      }
    });
    
    next();
  };
}

// Rate Limiting mit Performance Awareness
export function createSmartRateLimit(options = {}) {
  const { expressmRateLimit } = await import('express-rate-limit');
  
  return expressmRateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // limit each IP to 100 requests per windowMs
    
    // Dynamic rate limiting based on performance
    keyGenerator: (req) => {
      const metrics = performanceMetrics.getMetrics();
      
      // Reduce rate limit if server is under stress
      if (metrics.averageResponseTime > 1000 || 
          metrics.memoryUsage.current > 400) {
        return `stressed_${req.ip}`;
      }
      
      return req.ip;
    },
    
    // Custom handler with performance info
    handler: (req, res) => {
      const metrics = performanceMetrics.getMetrics();
      
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil(options.windowMs / 1000),
        serverMetrics: {
          averageResponseTime: metrics.averageResponseTime,
          memoryUsage: metrics.memoryUsage.current,
          activeRequests: metrics.requests - metrics.responses
        }
      });
    },
    
    // Add performance headers
    onLimitReached: (req, res) => {
      res.set('X-Performance-Limited', 'true');
    }
  });
}

export { performanceMetrics };