/**
 * Request Validation - Centralized validation middleware
 * Production-ready input validation
 */

import { NextRequest } from 'next/server';

/**
 * Request size limits
 */
export const REQUEST_LIMITS = {
  MAX_BODY_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_MESSAGE_LENGTH: 10000, // 10k characters
  MAX_QUERY_LENGTH: 1000, // 1k characters
  MAX_ARRAY_LENGTH: 1000, // 1k items
} as const;

/**
 * Validate request body size
 */
export function validateBodySize(request: NextRequest): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > REQUEST_LIMITS.MAX_BODY_SIZE) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${REQUEST_LIMITS.MAX_BODY_SIZE / 1024 / 1024}MB`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > REQUEST_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${REQUEST_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate message length
 */
export function validateMessageLength(message: string): { valid: boolean; error?: string } {
  if (message.length > REQUEST_LIMITS.MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message too long. Maximum length: ${REQUEST_LIMITS.MAX_MESSAGE_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate query length
 */
export function validateQueryLength(query: string): { valid: boolean; error?: string } {
  if (query.length > REQUEST_LIMITS.MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query too long. Maximum length: ${REQUEST_LIMITS.MAX_QUERY_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate array length
 */
export function validateArrayLength<T>(array: T[]): { valid: boolean; error?: string } {
  if (array.length > REQUEST_LIMITS.MAX_ARRAY_LENGTH) {
    return {
      valid: false,
      error: `Array too large. Maximum length: ${REQUEST_LIMITS.MAX_ARRAY_LENGTH} items`,
    };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '_');
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized;
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return {
      valid: false,
      error: 'File must have an extension',
    };
  }

  if (!allowedTypes.includes(extension)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

