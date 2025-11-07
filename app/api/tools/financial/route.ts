import { NextRequest } from 'next/server';
import { getStockPrice, getCryptoPrice, calculateFinancialMetrics } from '@/lib/tools/financial-apis';
import { validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

/**
 * Financial APIs - Free financial data
 * Enhanced with security validation
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, symbol, data } = body;

    // Validate operation
    if (!operation || typeof operation !== 'string') {
      return createErrorResponse(new Error('Operation is required'));
    }

    if (operation === 'stock' && symbol) {
      // Validate symbol
      if (typeof symbol !== 'string' || symbol.length > 10) {
        return createErrorResponse(new Error('Invalid stock symbol'));
      }

      // Sanitize symbol (uppercase, alphanumeric only)
      const sanitizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      if (!sanitizedSymbol) {
        return createErrorResponse(new Error('Invalid stock symbol format'));
      }

      const result = await getStockPrice(sanitizedSymbol);
      if (!result) {
        return Response.json(
          { error: 'Stock price not found' },
          { status: 404 }
        );
      }
      return Response.json({ success: true, result });
    }

    if (operation === 'crypto' && symbol) {
      // Validate symbol
      if (typeof symbol !== 'string' || symbol.length > 20) {
        return createErrorResponse(new Error('Invalid crypto symbol'));
      }

      // Sanitize symbol (lowercase, alphanumeric only)
      const sanitizedSymbol = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!sanitizedSymbol) {
        return createErrorResponse(new Error('Invalid crypto symbol format'));
      }

      const result = await getCryptoPrice(sanitizedSymbol);
      if (!result) {
        return Response.json(
          { error: 'Crypto price not found' },
          { status: 404 }
        );
      }
      return Response.json({ success: true, result });
    }

    if (operation === 'metrics' && data) {
      // Validate data
      if (
        typeof data.initialValue !== 'number' ||
        typeof data.finalValue !== 'number' ||
        typeof data.timePeriod !== 'number'
      ) {
        return createErrorResponse(new Error('Initial value, final value, and time period must be numbers'));
      }

      // Validate values are positive
      if (data.initialValue < 0 || data.finalValue < 0 || data.timePeriod < 0) {
        return createErrorResponse(new Error('Values must be positive'));
      }

      const result = calculateFinancialMetrics(data);
      return Response.json({ success: true, result });
    }

    return createErrorResponse(new Error('Invalid operation or missing parameters'));
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

