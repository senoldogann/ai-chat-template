/**
 * Simple In-Memory Cache with TTL support
 * Production-ready caching solution
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const entries: Array<{ key: string; age: number; expiresIn: number }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: Date.now() - entry.createdAt,
        expiresIn: entry.expiresAt - Date.now(),
      });
    }

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Singleton instance
export const cache = new Cache();

// Auto-clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanExpired();
  }, 5 * 60 * 1000);
}

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${JSON.stringify(args)}`;
}

