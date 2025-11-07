import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/security/headers';
import { validateBodySize } from '@/lib/security/validation';
import { rateLimiter, getRateLimitIdentifier } from '@/lib/utils/rate-limiter';

/**
 * Middleware - Applies security headers and rate limiting
 * Runs on every request
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (value) {
      response.headers.set(key, value);
    } else {
      response.headers.delete(key);
    }
  }

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = rateLimiter.isAllowed(identifier, 100, 60 * 1000); // 100 req/min for API

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            ...securityHeaders,
          },
        }
      );
    }

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toString());

    // Validate request body size
    const bodyValidation = validateBodySize(request);
    if (!bodyValidation.valid) {
      return NextResponse.json(
        {
          error: bodyValidation.error || 'Request body too large',
        },
        {
          status: 413,
          headers: securityHeaders,
        }
      );
    }
  }

  return response;
}

/**
 * Configure which routes middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

