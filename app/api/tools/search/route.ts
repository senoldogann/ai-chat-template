import { NextRequest } from 'next/server';
import { searchWeb } from '@/lib/tools/web-search';
import { validateQueryLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

/**
 * Web Search API - Free web search using DuckDuckGo
 * Enhanced with security validation
 */

const MAX_RESULTS = 10; // Limit max results to prevent abuse

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { query, maxResults = 5 } = body;

    // Validate query
    if (!query || typeof query !== 'string') {
      return createErrorResponse(new Error('Query is required and must be a string'));
    }

    // Validate query length
    const lengthValidation = validateQueryLength(query);
    if (!lengthValidation.valid) {
      return createErrorResponse(new Error(lengthValidation.error || 'Query too long'));
    }

    // Validate and limit maxResults
    if (typeof maxResults !== 'number' || maxResults < 1 || maxResults > MAX_RESULTS) {
      maxResults = Math.min(Math.max(1, maxResults || 5), MAX_RESULTS);
    }

    const result = await searchWeb(query, maxResults);
    return Response.json({ success: true, result });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

