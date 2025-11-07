/**
 * Web Search Tool - Free web search using DuckDuckGo
 * No API key required, completely free
 * Enhanced with caching, retry logic, and timeout handling
 */

import { cache, generateCacheKey } from '@/lib/utils/cache';
import { fetchWithRetry } from '@/lib/utils/retry';
import { safeJsonParse } from '@/lib/utils/json-parser';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResult {
  query: string;
  results: SearchResult[];
  totalResults: number;
  cached?: boolean;
}

/**
 * Search the web using DuckDuckGo Instant Answer API (free, no API key needed)
 * Enhanced with caching, retry logic, and timeout handling
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResult> {
  try {
    // Log web search request
    console.log(`[Web Search] Starting search for: "${query}"`);
    
    // Check cache first (10 minutes TTL for search results)
    const cacheKey = generateCacheKey('search', query, maxResults);
    const cached = cache.get<WebSearchResult>(cacheKey);
    if (cached) {
      console.log(`[Web Search] Using cached results for: "${query}"`);
      return { ...cached, cached: true };
    }
    
    // DuckDuckGo Instant Answer API (free, no key required)
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    console.log(`[Web Search] Fetching from DuckDuckGo: ${apiUrl}`);
    
    // Use fetchWithRetry for better reliability
    const response = await fetchWithRetry(
      apiUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      },
      {
        maxRetries: 2,
        initialDelay: 1000,
      }
    );

    // Safely parse JSON (handles HTML error pages)
    const data = await safeJsonParse<any>(response);
    const results: SearchResult[] = [];
    
    // Extract instant answer
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: data.AbstractText,
      });
    }
    
    // Extract related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    // If we have results, cache and return them
    if (results.length > 0) {
      const searchResult: WebSearchResult = {
        query,
        results: results.slice(0, maxResults),
        totalResults: results.length,
      };
      
      console.log(`[Web Search] Found ${results.length} results for: "${query}"`);
      
      // Cache for 10 minutes
      cache.set(cacheKey, searchResult, 10 * 60 * 1000);
      
      return searchResult;
    }
    
    console.log(`[Web Search] No results found for: "${query}", using fallback`);

    // Fallback: Return search URL
    const fallbackResult: WebSearchResult = {
      query,
      results: [{
        title: 'Web Search',
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `Search for "${query}" on DuckDuckGo. Click the link to view results.`,
      }],
      totalResults: 0,
    };
    
    // Cache fallback for shorter time (1 minute)
    cache.set(cacheKey, fallbackResult, 60 * 1000);
    
    return fallbackResult;
  } catch (error: any) {
    // Fallback: Return search URL
    return {
      query,
      results: [{
        title: 'Web Search',
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `Search for "${query}" on DuckDuckGo. Click the link to view results.`,
      }],
      totalResults: 0,
    };
  }
}

/**
 * Get current date/time information
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * Get current date in readable format
 */
export function getCurrentDate(): string {
  return new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

