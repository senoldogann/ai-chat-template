/**
 * Security Headers - Production-ready security headers
 * Implements OWASP security best practices
 */

export interface SecurityHeaders {
  [key: string]: string;
}

/**
 * Get production-ready security headers
 */
export function getSecurityHeaders(): SecurityHeaders {
  return {
    // Content Security Policy - XSS prevention
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.duckduckgo.com https://www.alphavantage.co https://api.coingecko.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),

    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (formerly Feature-Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
    ].join(', '),

    // Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Cross-Origin Resource Sharing
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',

    // Remove server information
    'X-Powered-By': '', // Remove X-Powered-By header
  };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  
  // Create new headers object
  const newHeaders = new Headers(response.headers);
  
  // Apply security headers
  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      newHeaders.set(key, value);
    } else {
      newHeaders.delete(key);
    }
  }
  
  // Return new response with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

