import { NextRequest } from 'next/server';
import { calculate, calculateROI, calculateCompoundInterest, calculatePortfolioValue } from '@/lib/tools/calculator';
import { validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

/**
 * Calculator API - Free mathematical calculations
 * Enhanced with security validation
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expression, operation, args } = body;

    // Validate operation
    if (!operation || typeof operation !== 'string') {
      return createErrorResponse(new Error('Operation is required'));
    }

    if (operation === 'basic' && expression) {
      // Validate expression length
      if (typeof expression !== 'string') {
        return createErrorResponse(new Error('Expression must be a string'));
      }

      const lengthValidation = validateMessageLength(expression);
      if (!lengthValidation.valid) {
        return createErrorResponse(new Error(lengthValidation.error || 'Expression too long'));
      }

      const result = calculate(expression);
      return Response.json({ success: true, result });
    }

    if (operation === 'roi' && args) {
      // Validate args
      if (typeof args.initial !== 'number' || typeof args.final !== 'number') {
        return createErrorResponse(new Error('Initial and final values must be numbers'));
      }

      const result = calculateROI(args.initial, args.final);
      return Response.json({ success: true, result: { roi: result } });
    }

    if (operation === 'compound' && args) {
      // Validate args
      if (
        typeof args.principal !== 'number' ||
        typeof args.rate !== 'number' ||
        typeof args.time !== 'number'
      ) {
        return createErrorResponse(new Error('Principal, rate, and time must be numbers'));
      }

      const result = calculateCompoundInterest(
        args.principal,
        args.rate,
        args.time,
        args.frequency || 12
      );
      return Response.json({ success: true, result: { amount: result } });
    }

    if (operation === 'portfolio' && args) {
      // Validate args
      if (!Array.isArray(args.positions)) {
        return createErrorResponse(new Error('Positions must be an array'));
      }

      // Validate each position
      for (const position of args.positions) {
        if (
          typeof position.quantity !== 'number' ||
          typeof position.price !== 'number'
        ) {
          return createErrorResponse(new Error('Each position must have quantity and price as numbers'));
        }
      }

      const result = calculatePortfolioValue(args.positions);
      return Response.json({ success: true, result: { value: result } });
    }

    return createErrorResponse(new Error('Invalid operation or missing parameters'));
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

