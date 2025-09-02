import Redis from 'ioredis';
import NodeCache from 'node-cache';

class CacheService {
  constructor() {
    // Redis für persistentes Caching (Production)
    this.redis = null;
    this.initRedis();
    
    // NodeCache als Fallback (Development)
    this.nodeCache = new NodeCache({
      stdTTL: 300, // 5 Minuten Standard TTL
      checkperiod: 60, // Prüfung alle 60 Sekunden
      maxKeys: 1000 // Maximum 1000 Keys
    });
    
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  async initRedis() {
    try {
      if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
        this.redis = new Redis(process.env.REDIS_URL || {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        this.redis.on('error', (error) => {
          console.warn('⚠️ Redis connection failed, using NodeCache fallback:', error.message);
          this.redis = null;
        });

        // Test connection
        await this.redis.ping();
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, using NodeCache:', error.message);
      this.redis = null;
    }
  }

  // Get Cache Key mit Namespace
  getCacheKey(namespace, key) {
    return `diy_humanoid:${namespace}:${key}`;
  }

  // Cache Get Operation
  async get(namespace, key) {
    const cacheKey = this.getCacheKey(namespace, key);
    
    try {
      let value = null;
      
      if (this.redis) {
        const redisValue = await this.redis.get(cacheKey);
        if (redisValue !== null) {
          value = JSON.parse(redisValue);
        }
      } else {
        value = this.nodeCache.get(cacheKey);
      }
      
      if (value !== null && value !== undefined) {
        this.cacheStats.hits++;
        return value;
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.misses++;
      return null;
    }
  }

  // Cache Set Operation
  async set(namespace, key, value, ttl = 300) {
    const cacheKey = this.getCacheKey(namespace, key);
    
    try {
      if (this.redis) {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
      } else {
        this.nodeCache.set(cacheKey, value, ttl);
      }
      
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Cache Delete Operation
  async delete(namespace, key) {
    const cacheKey = this.getCacheKey(namespace, key);
    
    try {
      if (this.redis) {
        await this.redis.del(cacheKey);
      } else {
        this.nodeCache.del(cacheKey);
      }
      
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Cache Pattern Delete (nur Redis)
  async deletePattern(pattern) {
    if (!this.redis) {
      console.warn('Pattern delete only available with Redis');
      return false;
    }
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.cacheStats.deletes += keys.length;
      }
      return true;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return false;
    }
  }

  // Cache Clear Namespace
  async clearNamespace(namespace) {
    const pattern = this.getCacheKey(namespace, '*');
    return await this.deletePattern(pattern);
  }

  // Cache Statistics
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      backend: this.redis ? 'Redis' : 'NodeCache'
    };
  }

  // Health Check
  async healthCheck() {
    try {
      await this.set('health', 'check', { timestamp: Date.now() }, 10);
      const result = await this.get('health', 'check');
      await this.delete('health', 'check');
      
      return {
        status: result ? 'healthy' : 'unhealthy',
        backend: this.redis ? 'Redis' : 'NodeCache',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        backend: this.redis ? 'Redis' : 'NodeCache',
        timestamp: Date.now()
      };
    }
  }
}

// Cache Middleware für Express
export function createCacheMiddleware(namespace, ttl = 300) {
  return async (req, res, next) => {
    // Cache Key basierend auf URL und Query Parameters
    const cacheKey = `${req.originalUrl}_${JSON.stringify(req.query)}`;
    
    try {
      const cachedData = await cacheService.get(namespace, cacheKey);
      
      if (cachedData) {
        // Cache Hit
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttl.toString());
        return res.json(cachedData);
      }
      
      // Cache Miss - Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response data
        cacheService.set(namespace, cacheKey, data, ttl).catch(console.error);
        
        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-TTL', ttl.toString());
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Performance Cache für häufige DB Queries
export class QueryCache {
  constructor(cacheService, namespace = 'queries', defaultTTL = 300) {
    this.cache = cacheService;
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
  }

  // Cache Wrapper für DB Queries
  async query(key, queryFunction, ttl = this.defaultTTL) {
    // Try Cache first
    const cachedResult = await this.cache.get(this.namespace, key);
    if (cachedResult) {
      return cachedResult;
    }

    // Execute Query
    try {
      const result = await queryFunction();
      
      // Cache Result
      await this.cache.set(this.namespace, key, result, ttl);
      
      return result;
    } catch (error) {
      console.error(`Query cache error for key ${key}:`, error);
      throw error;
    }
  }

  // Invalidate Cache für Updates
  async invalidate(pattern) {
    if (pattern.includes('*')) {
      return await this.cache.deletePattern(
        this.cache.getCacheKey(this.namespace, pattern)
      );
    } else {
      return await this.cache.delete(this.namespace, pattern);
    }
  }
}

// Singleton Instance
const cacheService = new CacheService();
export { cacheService };
export default cacheService;