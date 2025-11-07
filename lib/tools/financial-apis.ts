/**
 * Financial APIs Tool - Free financial data APIs
 * No API keys required for basic usage
 * Enhanced with caching, retry logic, and timeout handling
 */

import { cache, generateCacheKey } from '@/lib/utils/cache';
import { fetchWithRetry } from '@/lib/utils/retry';
import { safeJsonParse } from '@/lib/utils/json-parser';

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  cached?: boolean;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  currency: string;
  timestamp: string;
  cached?: boolean;
}

/**
 * Get stock price using Alpha Vantage API (free tier)
 * Enhanced with caching and retry logic
 */
export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    // Check cache first (5 minutes TTL for stock prices)
    const cacheKey = generateCacheKey('stock', symbol);
    const cached = cache.get<StockPrice>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // Using Alpha Vantage free API (500 calls/day free)
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    
    // Use fetchWithRetry for better reliability
    const response = await fetchWithRetry(
      url,
      {},
      {
        maxRetries: 2,
        initialDelay: 1000,
      }
    );

    // Safely parse JSON (handles HTML error pages)
    const data = await safeJsonParse<any>(response);
    
    // Check for API errors
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    // Check for rate limit
    if (data['Note']) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const stockPrice: StockPrice = {
        symbol: data['Global Quote']['01. symbol'],
        price: parseFloat(data['Global Quote']['05. price']),
        currency: 'USD',
        timestamp: new Date().toISOString(),
      };
      
      // Cache for 5 minutes
      cache.set(cacheKey, stockPrice, 5 * 60 * 1000);
      
      return stockPrice;
    }

    return null;
  } catch (error: any) {
    console.error('Stock price fetch error:', error);
    return null;
  }
}

/**
 * Get cryptocurrency price (free API, no key required)
 * Enhanced with caching and retry logic
 */
export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  try {
    // Check cache first (2 minutes TTL for crypto prices - more volatile)
    const cacheKey = generateCacheKey('crypto', symbol);
    const cached = cache.get<CryptoPrice>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // Using CoinGecko free API (no key required for basic usage)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`;
    
    // Use fetchWithRetry for better reliability
    const response = await fetchWithRetry(
      url,
      {},
      {
        maxRetries: 2,
        initialDelay: 1000,
      }
    );

    // Safely parse JSON (handles HTML error pages)
    const data = await safeJsonParse<any>(response);
    const priceData = data[symbol.toLowerCase()];
    
    if (priceData && priceData.usd) {
      const cryptoPrice: CryptoPrice = {
        symbol: symbol.toUpperCase(),
        price: priceData.usd,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      };
      
      // Cache for 2 minutes (crypto is more volatile)
      cache.set(cacheKey, cryptoPrice, 2 * 60 * 1000);
      
      return cryptoPrice;
    }

    return null;
  } catch (error: any) {
    console.error('Crypto price fetch error:', error);
    return null;
  }
}

/**
 * Calculate financial metrics
 */
export function calculateFinancialMetrics(data: {
  initialValue: number;
  finalValue: number;
  timePeriod: number; // in years
}): {
  roi: number;
  annualizedReturn: number;
  totalReturn: number;
} {
  const { initialValue, finalValue, timePeriod } = data;
  
  if (initialValue === 0) {
    throw new Error('Initial value cannot be zero');
  }

  const totalReturn = finalValue - initialValue;
  const roi = (totalReturn / initialValue) * 100;
  const annualizedReturn = timePeriod > 0 
    ? (Math.pow(finalValue / initialValue, 1 / timePeriod) - 1) * 100
    : 0;

  return {
    roi,
    annualizedReturn,
    totalReturn,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

