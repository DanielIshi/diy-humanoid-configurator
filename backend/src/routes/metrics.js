import express from 'express';
import { 
  performanceMetrics, 
  createHealthCheckEndpoint,
  responseTimeMiddleware 
} from '../middleware/performance.js';
import { cacheService } from '../services/cacheService.js';
import QueryOptimizer from '../services/queryOptimizer.js';
import { prisma } from '../db/client.js';

const router = express.Router();
const queryOptimizer = new QueryOptimizer(prisma);

// Middleware für alle Metrics Routes
router.use(responseTimeMiddleware());

// Performance Metrics Endpoint
router.get('/performance', async (req, res) => {
  try {
    const metrics = performanceMetrics.getMetrics();
    const cacheStats = cacheService.getStats();
    const queryStats = queryOptimizer.getQueryStats();
    
    res.json({
      timestamp: Date.now(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      performance: metrics,
      cache: cacheStats,
      database: {
        slowQueries: queryStats.slowQueries,
        queryStats: queryStats.queryStats
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Client-Side Metrics Collection Endpoint
router.post('/client-metrics', async (req, res) => {
  try {
    const { metrics, session, url, userAgent, timestamp } = req.body;
    
    if (!metrics || !session) {
      return res.status(400).json({ error: 'Invalid metrics data' });
    }
    
    // Store in cache for aggregation (Redis/NodeCache)
    const cacheKey = `client_metrics_${session}_${timestamp}`;
    await cacheService.set('client_metrics', cacheKey, {
      metrics,
      session,
      url,
      userAgent,
      timestamp,
      serverReceived: Date.now()
    }, 86400); // 24 hours
    
    // Log critical performance issues
    if (metrics.vitals) {
      const { fcp, lcp, fid, cls } = metrics.vitals;
      
      // Log poor Web Vitals
      const issues = [];
      if (fcp && fcp.rating === 'poor') issues.push(`FCP: ${fcp.value}ms`);
      if (lcp && lcp.rating === 'poor') issues.push(`LCP: ${lcp.value}ms`);
      if (fid && fid.rating === 'poor') issues.push(`FID: ${fid.value}ms`);
      if (cls && cls.rating === 'poor') issues.push(`CLS: ${cls.value}`);
      
      if (issues.length > 0) {
        console.warn(`Poor Web Vitals for ${url} (${session}): ${issues.join(', ')}`);
      }
    }
    
    res.json({ status: 'received', timestamp: Date.now() });
  } catch (error) {
    console.error('Error storing client metrics:', error);
    res.status(500).json({ error: 'Failed to store metrics' });
  }
});

// Aggregated Client Metrics
router.get('/client-metrics/aggregated', async (req, res) => {
  try {
    const { timeframe = '1h', url } = req.query;
    
    // This would typically query a proper metrics database
    // For now, we'll return cached data
    const cachePattern = `client_metrics_*`;
    // Note: Pattern matching would need Redis
    
    res.json({
      message: 'Aggregated metrics endpoint - implement with proper metrics storage',
      timeframe,
      url,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching aggregated metrics:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated metrics' });
  }
});

// Health Check with Performance Context
const healthCheck = createHealthCheckEndpoint([
  {
    name: 'cache',
    check: () => cacheService.healthCheck()
  },
  {
    name: 'database',
    check: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'healthy', responseTime: Date.now() };
      } catch (error) {
        return { status: 'error', error: error.message };
      }
    }
  }
]);

router.get('/health', healthCheck);

// Performance Budget Violations
router.get('/budget-violations', async (req, res) => {
  try {
    const violations = [];
    const metrics = performanceMetrics.getMetrics();
    
    // Server-side budget checks
    const serverBudget = {
      averageResponseTime: 500, // 500ms
      maxMemoryUsage: 512, // 512MB
      errorRate: 0.01 // 1%
    };
    
    // Check server response time
    if (metrics.averageResponseTime > serverBudget.averageResponseTime) {
      violations.push({
        type: 'server_response_time',
        actual: metrics.averageResponseTime,
        budget: serverBudget.averageResponseTime,
        severity: 'high'
      });
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage().rss / 1024 / 1024; // MB
    if (memoryUsage > serverBudget.maxMemoryUsage) {
      violations.push({
        type: 'server_memory_usage',
        actual: Math.round(memoryUsage),
        budget: serverBudget.maxMemoryUsage,
        severity: 'medium'
      });
    }
    
    // Check error rate
    const errorRate = metrics.errors / (metrics.requests || 1);
    if (errorRate > serverBudget.errorRate) {
      violations.push({
        type: 'server_error_rate',
        actual: (errorRate * 100).toFixed(2) + '%',
        budget: (serverBudget.errorRate * 100).toFixed(2) + '%',
        severity: 'high'
      });
    }
    
    res.json({
      violations,
      timestamp: Date.now(),
      total: violations.length
    });
  } catch (error) {
    console.error('Error checking budget violations:', error);
    res.status(500).json({ error: 'Failed to check budget violations' });
  }
});

// Performance Recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = [];
    const metrics = performanceMetrics.getMetrics();
    const queryStats = queryOptimizer.getQueryStats();
    
    // Analyze performance patterns and suggest improvements
    if (metrics.averageResponseTime > 1000) {
      recommendations.push({
        type: 'response_time',
        priority: 'high',
        title: 'Langsame Response-Zeiten erkannt',
        description: `Durchschnittliche Response-Zeit: ${metrics.averageResponseTime}ms`,
        actions: [
          'Database-Queries optimieren',
          'Caching implementieren',
          'API Response komprimieren'
        ]
      });
    }
    
    if (queryStats.slowQueries.length > 5) {
      recommendations.push({
        type: 'database',
        priority: 'high',
        title: 'Langsame Database-Queries erkannt',
        description: `${queryStats.slowQueries.length} langsame Queries in den letzten 24h`,
        actions: [
          'Database-Indizes überprüfen',
          'Query-Optimierung durchführen',
          'N+1 Query-Probleme beheben'
        ]
      });
    }
    
    const cacheStats = cacheService.getStats();
    const hitRate = parseFloat(cacheStats.hitRate.replace('%', ''));
    
    if (hitRate < 70) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Niedrige Cache-Hit-Rate',
        description: `Cache-Hit-Rate: ${cacheStats.hitRate}`,
        actions: [
          'Cache-TTL optimieren',
          'Mehr Endpoints cachen',
          'Cache-Warming implementieren'
        ]
      });
    }
    
    const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
    if (memoryUsage > 400) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: 'Hoher Memory-Verbrauch',
        description: `Memory-Usage: ${Math.round(memoryUsage)}MB`,
        actions: [
          'Memory-Leaks prüfen',
          'Garbage Collection optimieren',
          'Object-Pooling implementieren'
        ]
      });
    }
    
    res.json({
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      timestamp: Date.now(),
      total: recommendations.length
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Reset Metrics (Development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/reset', async (req, res) => {
    try {
      performanceMetrics.reset();
      await queryOptimizer.cleanup();
      
      res.json({ 
        status: 'reset', 
        timestamp: Date.now() 
      });
    } catch (error) {
      console.error('Error resetting metrics:', error);
      res.status(500).json({ error: 'Failed to reset metrics' });
    }
  });
}

export default router;