/**
 * Safe JSON Parser - Handles HTML responses and other non-JSON content
 * Prevents "Unexpected token '<'" errors
 */

/**
 * Safely parse JSON response
 * Checks Content-Type and handles HTML/error pages
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
  // Get text first (can only read response body once)
  const text = await response.text();
  
  // Check Content-Type
  const contentType = response.headers.get('content-type') || '';
  
  // Check if it's HTML (error page)
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(`Received HTML instead of JSON. Status: ${response.status}. This might be an error page. First 200 chars: ${text.substring(0, 200)}`);
  }
  
  // Check Content-Type
  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    // Content-Type doesn't say JSON, but try to parse anyway
    // (some APIs don't set Content-Type correctly)
    try {
      return JSON.parse(text) as T;
    } catch (error: any) {
      throw new Error(`Failed to parse response as JSON. Content-Type: ${contentType}. Status: ${response.status}. First 200 chars: ${text.substring(0, 200)}`);
    }
  }
  
  // Content-Type says JSON, parse it
  try {
    return JSON.parse(text) as T;
  } catch (error: any) {
    throw new Error(`JSON parse error: ${error.message}. Status: ${response.status}. First 200 chars: ${text.substring(0, 200)}`);
  }
}

/**
 * Check if response is JSON
 */
export function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') || contentType.includes('text/json');
}

