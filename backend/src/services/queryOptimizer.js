import { PrismaClient } from '@prisma/client';
import { cacheService, QueryCache } from './cacheService.js';

class QueryOptimizer {
  constructor(prisma) {
    this.prisma = prisma;
    this.queryCache = new QueryCache(cacheService, 'db_queries', 300);
    this.slowQueryLog = [];
    this.queryStats = new Map();
    
    this.initializeOptimizations();
  }

  initializeOptimizations() {
    // Middleware für Query Performance Monitoring
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      const queryKey = `${params.model}_${params.action}`;
      
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        this.recordQueryStats(queryKey, duration, true);
        
        // Log slow queries (>500ms)
        if (duration > 500) {
          this.slowQueryLog.push({
            model: params.model,
            action: params.action,
            args: this.sanitizeArgs(params.args),
            duration,
            timestamp: new Date().toISOString()
          });
          
          // Keep only last 100 slow queries
          if (this.slowQueryLog.length > 100) {
            this.slowQueryLog.shift();
          }
          
          console.warn(`Slow query detected: ${queryKey} took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordQueryStats(queryKey, duration, false);
        throw error;
      }
    });
  }

  recordQueryStats(queryKey, duration, success) {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastExecuted: null
      });
    }
    
    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.lastExecuted = new Date();
    
    if (!success) {
      stats.errors++;
    }
  }

  sanitizeArgs(args) {
    // Remove sensitive data from logs
    if (!args) return args;
    
    const sanitized = { ...args };
    
    // Remove passwords and tokens
    if (sanitized.data) {
      const data = { ...sanitized.data };
      if (data.password) data.password = '[REDACTED]';
      if (data.token) data.token = '[REDACTED]';
      if (data.email) data.email = '[REDACTED]';
      sanitized.data = data;
    }
    
    return sanitized;
  }

  // Optimized User Queries
  async getUserByIdOptimized(userId, includeRelations = false) {
    const cacheKey = `user_${userId}_${includeRelations}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      const include = includeRelations ? {
        configurations: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Limit to last 10 configurations
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20 // Limit to last 20 orders
        }
      } : undefined;

      return await this.prisma.user.findUnique({
        where: { id: userId },
        include
      });
    }, 600); // Cache for 10 minutes
  }

  // Optimized Configuration Queries mit Pagination
  async getConfigurationsPaginated(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const cacheKey = `configurations_${userId}_${page}_${pageSize}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      const [configurations, total] = await Promise.all([
        this.prisma.configuration.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: pageSize,
          select: {
            id: true,
            name: true,
            description: true,
            totalPrice: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            // Exclude large JSON fields for list view
            // configuration: false
          }
        }),
        this.prisma.configuration.count({
          where: { userId }
        })
      ]);

      return {
        configurations,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1
        }
      };
    }, 300);
  }

  // Optimized Orders Query mit Status Filter
  async getOrdersOptimized(userId, status = null, limit = 50) {
    const cacheKey = `orders_${userId}_${status}_${limit}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      const where = { userId };
      if (status) {
        where.status = status;
      }

      return await this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          orderItems: {
            select: {
              id: true,
              quantity: true,
              price: true,
              component: {
                select: {
                  name: true,
                  category: true
                }
              }
            }
          }
        }
      });
    }, 180); // Cache for 3 minutes (orders change more frequently)
  }

  // Optimized Component Search mit Full-Text Search
  async searchComponents(query, category = null, limit = 20) {
    const cacheKey = `search_${query}_${category}_${limit}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      const where = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      };
      
      if (category) {
        where.category = category;
      }

      return await this.prisma.component.findMany({
        where,
        orderBy: [
          { popularity: 'desc' },
          { name: 'asc' }
        ],
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          imageUrl: true,
          inStock: true,
          popularity: true,
          tags: true
        }
      });
    }, 600); // Cache search results for 10 minutes
  }

  // Batch Operations für bessere Performance
  async batchGetComponents(componentIds) {
    const cacheKey = `batch_components_${componentIds.sort().join('_')}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      return await this.prisma.component.findMany({
        where: {
          id: { in: componentIds }
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          imageUrl: true,
          inStock: true,
          specifications: true
        }
      });
    }, 900); // Cache for 15 minutes (components don't change often)
  }

  // Statistics Queries mit Aggregation
  async getDashboardStats(userId) {
    const cacheKey = `dashboard_stats_${userId}`;
    
    return await this.queryCache.query(cacheKey, async () => {
      const [
        configurationCount,
        orderCount,
        totalSpent,
        recentActivity
      ] = await Promise.all([
        this.prisma.configuration.count({ where: { userId } }),
        this.prisma.order.count({ where: { userId } }),
        this.prisma.order.aggregate({
          where: { userId, status: 'COMPLETED' },
          _sum: { totalPrice: true }
        }),
        this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true
          }
        })
      ]);

      return {
        configurations: configurationCount,
        orders: orderCount,
        totalSpent: totalSpent._sum.totalPrice || 0,
        recentActivity
      };
    }, 300);
  }

  // Cache Invalidation Methods
  async invalidateUserCache(userId) {
    await Promise.all([
      this.queryCache.invalidate(`user_${userId}*`),
      this.queryCache.invalidate(`configurations_${userId}*`),
      this.queryCache.invalidate(`orders_${userId}*`),
      this.queryCache.invalidate(`dashboard_stats_${userId}`)
    ]);
  }

  async invalidateComponentCache(componentId = null) {
    if (componentId) {
      await this.queryCache.invalidate(`*components*${componentId}*`);
    } else {
      await this.queryCache.invalidate('*components*');
      await this.queryCache.invalidate('search_*');
    }
  }

  // Query Performance Analytics
  getQueryStats() {
    return {
      slowQueries: this.slowQueryLog.slice(-20), // Last 20 slow queries
      queryStats: Object.fromEntries(this.queryStats),
      cacheStats: cacheService.getStats()
    };
  }

  // Database Connection Pool Optimization
  async optimizeConnectionPool() {
    // Prisma handles connection pooling automatically,
    // but we can provide recommendations based on usage
    const stats = this.getQueryStats();
    const recommendations = [];
    
    const avgResponseTime = Object.values(stats.queryStats)
      .reduce((sum, stat) => sum + stat.averageTime, 0) / 
      Object.keys(stats.queryStats).length;
    
    if (avgResponseTime > 1000) {
      recommendations.push({
        type: 'connection_pool',
        message: 'Consider increasing database connection pool size',
        currentAvg: avgResponseTime
      });
    }
    
    if (this.slowQueryLog.length > 10) {
      recommendations.push({
        type: 'indexes',
        message: 'Multiple slow queries detected. Review database indexes.',
        slowQueries: this.slowQueryLog.length
      });
    }
    
    return recommendations;
  }

  // Cleanup old cache entries and stats
  async cleanup() {
    // Clear old slow query logs (>24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.slowQueryLog = this.slowQueryLog.filter(
      log => new Date(log.timestamp).getTime() > oneDayAgo
    );
    
    // Reset query stats if they get too large
    if (this.queryStats.size > 1000) {
      console.log('Resetting query stats to prevent memory issues');
      this.queryStats.clear();
    }
  }
}

export default QueryOptimizer;