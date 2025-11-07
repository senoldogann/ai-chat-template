/**
 * CSRF Protection - Token-based CSRF protection
 * Production-ready CSRF prevention
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const token = randomBytes(32).toString('hex');
  return token;
}

/**
 * Generate CSRF token hash
 */
export function hashCSRFToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, hash: string): boolean {
  const computedHash = hashCSRFToken(token);
  return computedHash === hash;
}

/**
 * Get CSRF token from request
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Try to get from header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }

  // Try to get from body (for POST requests)
  // Note: This requires async body parsing, handled in middleware
  return null;
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(
  request: Request,
  sessionToken: string | null
): Promise<boolean> {
  // Skip CSRF for GET, HEAD, OPTIONS
  const method = request.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // If no session token, reject
  if (!sessionToken) {
    return false;
  }

  // Get token from request
  const requestToken = getCSRFTokenFromRequest(request);
  if (!requestToken) {
    return false;
  }

  // Verify token
  return verifyCSRFToken(requestToken, sessionToken);
}

