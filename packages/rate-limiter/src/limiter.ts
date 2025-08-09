import Redis from 'ioredis';
import { RateLimitConfig, RateLimitResult, UserIdentifier } from './types';

export class RateLimiter {
  private redis: Redis | null = null;
  private mockStore: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(
    private config: RateLimitConfig,
    redisUrl?: string
  ) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        console.log('[RateLimiter] Connected to Redis');
      } catch (error) {
        console.warn('[RateLimiter] Redis connection failed, using in-memory store', error);
      }
    } else {
      console.log('[RateLimiter] No Redis URL provided, using in-memory store');
    }
  }

  async check(identifier: UserIdentifier): Promise<RateLimitResult> {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const resetAt = new Date(now + this.config.windowMs);

    if (this.redis) {
      return this.checkRedis(key, now, windowStart, resetAt);
    } else {
      return this.checkMemory(key, now, resetAt);
    }
  }

  async getRemainingAttempts(identifier: UserIdentifier): Promise<number> {
    const result = await this.check(identifier);
    return result.remaining;
  }

  async reset(identifier: UserIdentifier): Promise<void> {
    const key = this.getKey(identifier);
    
    if (this.redis) {
      await this.redis.del(key);
    } else {
      this.mockStore.delete(key);
    }
  }

  private async checkRedis(key: string, now: number, windowStart: number, resetAt: Date): Promise<RateLimitResult> {
    const pipeline = this.redis!.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }
    
    const count = results[1][1] as number;
    const allowed = count < this.config.max;
    
    if (!allowed) {
      // Remove the request we just added since it's not allowed
      await this.redis!.zrem(key, `${now}-${Math.random()}`);
    }
    
    return {
      allowed,
      remaining: Math.max(0, this.config.max - count - (allowed ? 1 : 0)),
      resetAt
    };
  }

  private checkMemory(key: string, now: number, resetAt: Date): Promise<RateLimitResult> {
    const entry = this.mockStore.get(key);
    
    if (!entry || entry.resetAt.getTime() < now) {
      // New window
      this.mockStore.set(key, { count: 1, resetAt });
      return Promise.resolve({
        allowed: true,
        remaining: this.config.max - 1,
        resetAt
      });
    }
    
    if (entry.count >= this.config.max) {
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      });
    }
    
    entry.count++;
    return Promise.resolve({
      allowed: true,
      remaining: this.config.max - entry.count,
      resetAt: entry.resetAt
    });
  }

  private getKey(identifier: UserIdentifier): string {
    const window = this.getWindow();
    return `rate_limit:${identifier.type}:${identifier.value}:${window}`;
  }

  private getWindow(): string {
    // For daily limits, use the date as window
    if (this.config.windowMs >= 24 * 60 * 60 * 1000) {
      return new Date().toISOString().split('T')[0];
    }
    
    // For hourly limits
    if (this.config.windowMs >= 60 * 60 * 1000) {
      const now = new Date();
      return `${now.toISOString().split('T')[0]}-${now.getHours()}`;
    }
    
    // For minute-based limits
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    return windowStart.toString();
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Factory function for creating rate limiters with different configurations
export function createRateLimiter(type: 'preview' | 'api', redisUrl?: string): RateLimiter {
  const configs: Record<string, RateLimitConfig> = {
    preview: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: parseInt(process.env.MAX_FREE_PREVIEWS_ANONYMOUS || '3')
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 10 // 10 requests per minute
    }
  };

  return new RateLimiter(configs[type], redisUrl);
}