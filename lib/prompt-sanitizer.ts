/**
 * Sanitize user input to prevent prompt injection attacks
 */

// Common prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+(instructions?|prompts?|commands?)/i,
  /forget\s+(previous|above|all)\s+(instructions?|prompts?|commands?)/i,
  /disregard\s+(previous|above|all)\s+(instructions?|prompts?|commands?)/i,
  /override\s+(previous|above|all)\s+(instructions?|prompts?|commands?)/i,
  /system\s*:\s*ignore/i,
  /system\s*:\s*forget/i,
  /you\s+are\s+now/i,
  /act\s+as\s+if/i,
  /pretend\s+to\s+be/i,
  /roleplay\s+as/i,
  /you\s+must\s+always/i,
  /never\s+(say|tell|mention)/i,
  /always\s+(say|tell|mention)/i,
  /\[INST\]/i,
  /\[SYSTEM\]/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
];

// Suspicious keywords
const SUSPICIOUS_KEYWORDS = [
  'jailbreak',
  'bypass',
  'hack',
  'exploit',
  'vulnerability',
  'admin',
  'root',
  'sudo',
  'password',
  'token',
  'api key',
  'secret',
];

/**
 * Check if input contains prompt injection patterns
 */
export function containsInjectionPattern(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  // Check for suspicious keywords in context
  const suspiciousCount = SUSPICIOUS_KEYWORDS.filter(keyword => 
    lowerInput.includes(keyword)
  ).length;
  
  // If multiple suspicious keywords, flag it
  if (suspiciousCount >= 2) {
    return true;
  }
  
  return false;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length to prevent DoS
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate and sanitize message content
 */
export function validateMessage(content: string): { valid: boolean; sanitized: string; error?: string } {
  // Sanitize input
  const sanitized = sanitizeInput(content);
  
  // Check if empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    return {
      valid: false,
      sanitized: '',
      error: 'Mesaj boş olamaz',
    };
  }
  
  // Check for injection patterns
  if (containsInjectionPattern(sanitized)) {
    return {
      valid: false,
      sanitized: sanitized,
      error: 'Mesajınız güvenlik nedeniyle reddedildi. Lütfen farklı bir mesaj deneyin.',
    };
  }
  
  return {
    valid: true,
    sanitized: sanitized,
  };
}

