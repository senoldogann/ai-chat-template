/**
 * Safe Fetch Utilities - Handles HTML responses and JSON parsing errors
 * For use in client-side components
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
    throw new Error(`Received HTML instead of JSON. Status: ${response.status}. This might be an error page.`);
  }
  
  // Check Content-Type
  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    // Content-Type doesn't say JSON, but try to parse anyway
    // (some APIs don't set Content-Type correctly)
    try {
      return JSON.parse(text) as T;
    } catch (error: any) {
      throw new Error(`Failed to parse response as JSON. Content-Type: ${contentType}. Status: ${response.status}`);
    }
  }
  
  // Content-Type says JSON, parse it
  try {
    return JSON.parse(text) as T;
  } catch (error: any) {
    throw new Error(`JSON parse error: ${error.message}. Status: ${response.status}`);
  }
}

/**
 * Safe fetch with JSON parsing
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, options);
  
  // Clone response for error handling (response body can only be read once)
  const responseClone = response.clone();
  
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const text = await responseClone.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        errorMessage = `Received HTML error page. Status: ${response.status}`;
      } else {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Not JSON, use default message
        }
      }
    } catch {
      // Ignore
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await safeJsonParse<T>(response);
  return { data, response };
}

