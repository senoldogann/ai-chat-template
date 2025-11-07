/**
 * Error Handler - Secure error handling
 * Prevents sensitive information leakage
 */

/**
 * Sanitize error message for client
 * Removes sensitive information like stack traces, file paths, etc.
 */
export function sanitizeError(error: unknown): {
  message: string;
  code?: string;
  statusCode: number;
} {
  // Default error
  const defaultError = {
    message: 'An error occurred. Please try again later.',
    statusCode: 500,
  };

  // If error is not an Error object, return default
  if (!(error instanceof Error)) {
    return defaultError;
  }

  // Check for known error types
  if (error.message.includes('ECONNREFUSED')) {
    return {
      message: 'Service temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    };
  }

  if (error.message.includes('ETIMEDOUT')) {
    return {
      message: 'Request timeout. Please try again.',
      code: 'TIMEOUT',
      statusCode: 504,
    };
  }

  if (error.message.includes('ENOTFOUND')) {
    return {
      message: 'Service temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    };
  }

  // Check for validation errors (safe to show)
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  // Check for authentication errors (safe to show)
  if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
    return {
      message: 'Authentication required',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    };
  }

  // Check for rate limit errors (safe to show)
  if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
    return {
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    };
  }

  // For all other errors, return generic message
  // Log full error server-side but don't expose to client
  console.error('Error details (server-side only):', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });

  return defaultError;
}

/**
 * Create error response
 */
export function createErrorResponse(error: unknown): Response {
  const sanitized = sanitizeError(error);
  
  return Response.json(
    {
      error: sanitized.message,
      code: sanitized.code,
    },
    {
      status: sanitized.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

