import { evaluate, create, all } from 'mathjs';
import { Decimal } from 'decimal.js';
import { cache, generateCacheKey } from '@/lib/utils/cache';

/**
 * Calculator Tool - Performs mathematical calculations
 * Supports basic arithmetic, advanced math, and high-precision calculations
 * Enhanced with caching and better validation
 */

// Create mathjs instance with more functions
const math = create(all);

export interface CalculatorResult {
  result: string;
  expression: string;
  precision?: number;
  cached?: boolean;
}

/**
 * Validate mathematical expression (enhanced security)
 */
function validateExpression(expression: string): { valid: boolean; error?: string } {
  // Remove whitespace for validation
  const clean = expression.replace(/\s/g, '');
  
  // Check for dangerous patterns
  if (clean.includes('eval') || clean.includes('exec') || clean.includes('import')) {
    return { valid: false, error: 'Dangerous patterns detected' };
  }
  
  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of clean) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, error: 'Unbalanced parentheses' };
  }
  
  // Check for valid characters (numbers, operators, parentheses, functions)
  const validPattern = /^[0-9+\-*/().\s,sin|cos|tan|log|ln|sqrt|pow|exp|abs|floor|ceil|round|max|min|pi|e]+$/i;
  if (!validPattern.test(clean)) {
    return { valid: false, error: 'Invalid characters in expression' };
  }
  
  return { valid: true };
}

/**
 * Calculate mathematical expression with high precision
 * Enhanced with caching and better error handling
 */
export function calculate(expression: string, precision: number = 50): CalculatorResult {
  try {
    // Remove any whitespace
    expression = expression.trim();
    
    // Validate expression
    const validation = validateExpression(expression);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid expression');
    }
    
    // Check cache
    const cacheKey = generateCacheKey('calc', expression, precision);
    const cached = cache.get<CalculatorResult>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // For high precision calculations, use Decimal.js
    if (expression.includes('.') || expression.includes(',')) {
      Decimal.set({ precision });
      
      // Use mathjs for evaluation (safer than eval)
      const result = math.evaluate(expression);
      const decimalResult = new Decimal(result.toString());
      
      const calcResult: CalculatorResult = {
        result: decimalResult.toFixed(precision),
        expression,
        precision,
      };
      
      // Cache result (5 minutes)
      cache.set(cacheKey, calcResult, 5 * 60 * 1000);
      
      return calcResult;
    }
    
    // For simple expressions, use mathjs
    const result = math.evaluate(expression);
    
    const calcResult: CalculatorResult = {
      result: result.toString(),
      expression,
    };
    
    // Cache result (5 minutes)
    cache.set(cacheKey, calcResult, 5 * 60 * 1000);
    
    return calcResult;
  } catch (error: any) {
    throw new Error(`Calculation error: ${error.message}`);
  }
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) throw new Error('Cannot divide by zero');
  return (part / total) * 100;
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): number {
  return principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * time);
}

/**
 * Calculate financial metrics
 */
export function calculateROI(initial: number, final: number): number {
  if (initial === 0) throw new Error('Initial value cannot be zero');
  return ((final - initial) / initial) * 100;
}

/**
 * Calculate portfolio metrics
 */
export function calculatePortfolioValue(positions: Array<{ quantity: number; price: number }>): number {
  return positions.reduce((total, position) => total + position.quantity * position.price, 0);
}

