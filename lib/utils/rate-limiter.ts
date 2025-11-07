/**
 * Rate Limiter - Prevents abuse and API rate limit issues
 * Production-ready rate limiting solution
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequest: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private defaultWindow: number = 60 * 1000; // 1 minute
  private defaultMaxRequests: number = 60; // 60 requests per minute

  /**
   * Check if request is allowed
   */
  isAllowed(
    identifier: string,
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindow
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No entry or window expired
    if (!entry || now > entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
        firstRequest: now,
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Get current rate limit status
   */
  getStatus(identifier: string): {
    count: number;
    remaining: number;
    resetAt: number;
  } | null {
    const entry = this.limits.get(identifier);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.resetAt) {
      this.limits.delete(identifier);
      return null;
    }

    return {
      count: entry.count,
      remaining: this.defaultMaxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Auto-clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanExpired();
  }, 5 * 60 * 1000);
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: Request | { headers: Headers }): string {
  // Try to get IP from headers
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

