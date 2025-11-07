/**
 * Ollama Provider - Local/self-hosted models
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class OllamaProvider implements LLMProviderInterface {
  name: 'ollama' = 'ollama';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    // Ollama local doesn't require API key, but cloud does
    // baseURL is always required
    if (!config.baseURL) return false;
    
    // If using cloud URL, API key is required
    if (config.baseURL.includes('ollama.com') && !config.apiKey) {
      return false;
    }
    
    return true;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || 'http://localhost:11434';
    const model = request.model || this.config.model || 'llama3.1';

    // Build headers - include Authorization for cloud mode
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add API key for cloud mode
    if (this.config.apiKey && baseURL.includes('ollama.com')) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Determine the correct endpoint based on baseURL
    // If baseURL includes 'ollama.com', it's cloud and endpoint is /chat
    // If baseURL is localhost, it's local and endpoint is /api/chat
    const isCloud = baseURL.includes('ollama.com');
    const endpoint = isCloud ? '/chat' : '/api/chat';

    const requestBody = {
      model,
      messages: request.messages,
      options: {
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        num_predict: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
      },
      stream: false,
    };

    // Debug: log request details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OllamaProvider.chat] baseURL: ${baseURL}`);
      console.log(`[OllamaProvider.chat] endpoint: ${endpoint}`);
      console.log(`[OllamaProvider.chat] full URL: ${baseURL}${endpoint}`);
      console.log(`[OllamaProvider.chat] has API key: ${!!this.config.apiKey}`);
      console.log(`[OllamaProvider.chat] isCloud: ${isCloud}`);
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || response.statusText };
      }
      
      // Debug: log error details (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error(`[OllamaProvider.chat] Error response:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: `${baseURL}${endpoint}`,
        });
      }
      
      throw new Error(errorData.error || `Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.message?.content || '',
      model: data.model || model,
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const baseURL = this.config.baseURL || 'http://localhost:11434';
    const model = request.model || this.config.model || 'llama3.1';

    // Build headers - include Authorization for cloud mode
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add API key for cloud mode
    if (this.config.apiKey && baseURL.includes('ollama.com')) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Determine the correct endpoint based on baseURL
    // If baseURL includes 'ollama.com', it's cloud and endpoint is /chat
    // If baseURL is localhost, it's local and endpoint is /api/chat
    const isCloud = baseURL.includes('ollama.com');
    const endpoint = isCloud ? '/chat' : '/api/chat';

    const requestBody = {
      model,
      messages: request.messages,
      options: {
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        num_predict: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
      },
      stream: true,
    };

    // Debug: log request details (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OllamaProvider.stream] baseURL: ${baseURL}`);
      console.log(`[OllamaProvider.stream] endpoint: ${endpoint}`);
      console.log(`[OllamaProvider.stream] full URL: ${baseURL}${endpoint}`);
      console.log(`[OllamaProvider.stream] has API key: ${!!this.config.apiKey}`);
      console.log(`[OllamaProvider.stream] isCloud: ${isCloud}`);
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || response.statusText };
      }
      
      // Debug: log error details (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error(`[OllamaProvider.stream] Error response:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: `${baseURL}${endpoint}`,
        });
      }
      
      throw new Error(errorData.error || `Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        let foundDone = false;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Final decode: if there's a value, decode it with stream: false
            // Then process any remaining buffer
            if (value) {
              // Decode final chunk with stream: false to ensure complete decoding
              buffer += decoder.decode(value, { stream: false });
            }
            
            // Process all remaining buffer content (including incomplete last line)
            // CRITICAL: Process ALL lines including the last one
            if (buffer.trim()) {
              // Split by newline, but also process the last line even if it doesn't end with \n
              const lines = buffer.split('\n');
              
              // Process ALL lines including the last one
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === '') continue;
                
                try {
                  const json = JSON.parse(line);
                  const delta = json.message?.content;
                  if (delta) {
                    controller.enqueue({
                      content: delta,
                      done: json.done || false,
                      model: json.model || model,
                    });
                  }
                  if (json.done) {
                    foundDone = true;
                  }
                } catch (e) {
                  // If line is incomplete JSON, try to extract partial content
                  // This handles cases where the stream ends mid-JSON
                  try {
                    // Method 1: Try to extract partial content with better regex (handles escaped characters)
                    const partialMatch = line.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/);
                    if (partialMatch && partialMatch[1]) {
                      // Unescape the content
                      const unescaped = partialMatch[1].replace(/\\(.)/g, '$1');
                      if (unescaped) {
                        controller.enqueue({
                          content: unescaped,
                          done: true,
                          model: model,
                        });
                        foundDone = true;
                      }
                    } else {
                      // Method 2: Try simpler regex
                      const simpleMatch = line.match(/"content"\s*:\s*"([^"]*)/);
                      if (simpleMatch && simpleMatch[1]) {
                        controller.enqueue({
                          content: simpleMatch[1],
                          done: true,
                          model: model,
                        });
                        foundDone = true;
                      } else {
                        // Method 3: Try to extract any text that looks like content
                        const textMatch = line.match(/"([^"]{1,200})"/);
                        if (textMatch && textMatch[1]) {
                          controller.enqueue({
                            content: textMatch[1],
                            done: true,
                            model: model,
                          });
                          foundDone = true;
                        }
                      }
                    }
                  } catch (e2) {
                    // Ignore parse errors
                  }
                }
              }
            }
            
            // Send done signal and close
            controller.enqueue({ content: '', done: true });
            controller.close();
            return;
          }

          // Decode chunk (use stream: true for partial chunks)
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.trim() === '') continue;
            
            try {
              const json = JSON.parse(line);
              const delta = json.message?.content;
              
              // Process content even if done is true (last chunk)
              if (delta) {
                // Debug: log content processing
                if (process.env.NODE_ENV === 'development' && json.done) {
                  console.log(`[OllamaProvider] Processing final chunk with content: ${delta.substring(0, 50)}...`);
                }
                
                controller.enqueue({
                  content: delta,
                  done: json.done || false,
                  model: json.model || model,
                });
              }
              
              // Mark if we found done=true, but DON'T close yet - continue processing
              if (json.done) {
                foundDone = true;
                // CRITICAL: Don't return here - continue to process remaining buffer
                // We'll close after processing all remaining buffer
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[OllamaProvider] Found done=true, buffer remaining: ${buffer.substring(0, 100)}...`);
                }
              }
            } catch (e) {
              // Ignore parse errors
              if (process.env.NODE_ENV === 'development') {
                console.error(`[OllamaProvider] Parse error for line: ${line.substring(0, 50)}...`, e);
              }
            }
          }
          
          // If we found done=true, process remaining buffer and close
          // BUT: Only close if we've processed all complete lines
          // Continue reading to ensure we get all data
          if (foundDone) {
            // Process any remaining buffer before closing
            if (buffer.trim()) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[OllamaProvider] Processing remaining buffer: ${buffer.substring(0, 100)}...`);
              }
              
              try {
                const finalJson = JSON.parse(buffer.trim());
                const finalDelta = finalJson.message?.content;
                if (finalDelta) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`[OllamaProvider] Final delta from buffer: ${finalDelta.substring(0, 50)}...`);
                  }
                  controller.enqueue({
                    content: finalDelta,
                    done: true,
                    model: finalJson.model || model,
                  });
                }
              } catch (e) {
                // If buffer is incomplete JSON, try to extract partial content
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[OllamaProvider] Buffer is incomplete JSON, trying extraction...`);
                }
                
                try {
                  // Method 1: Try to extract partial content with better regex (handles escaped characters)
                  const partialMatch = buffer.trim().match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/);
                  if (partialMatch && partialMatch[1]) {
                    const unescaped = partialMatch[1].replace(/\\(.)/g, '$1');
                    if (unescaped) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[OllamaProvider] Extracted partial content: ${unescaped.substring(0, 50)}...`);
                      }
                      controller.enqueue({
                        content: unescaped,
                        done: true,
                        model: model,
                      });
                    }
                  } else {
                    // Method 2: Try simpler regex
                    const simpleMatch = buffer.trim().match(/"content"\s*:\s*"([^"]*)/);
                    if (simpleMatch && simpleMatch[1]) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[OllamaProvider] Extracted simple content: ${simpleMatch[1].substring(0, 50)}...`);
                      }
                      controller.enqueue({
                        content: simpleMatch[1],
                        done: true,
                        model: model,
                      });
                    } else {
                      // Method 3: Try to extract any text that looks like content
                      const textMatch = buffer.trim().match(/"([^"]{1,200})"/);
                      if (textMatch && textMatch[1]) {
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`[OllamaProvider] Extracted text content: ${textMatch[1].substring(0, 50)}...`);
                        }
                        controller.enqueue({
                          content: textMatch[1],
                          done: true,
                          model: model,
                        });
                      }
                    }
                  }
                } catch (e2) {
                  // Ignore parse errors
                  if (process.env.NODE_ENV === 'development') {
                    console.error(`[OllamaProvider] Failed to extract partial content`, e2);
                  }
                }
              }
            }
            
            // Buffer is processed, we can safely close
            if (process.env.NODE_ENV === 'development') {
              console.log(`[OllamaProvider] Closing stream after processing all data`);
            }
            controller.enqueue({ content: '', done: true });
            controller.close();
            return;
          }
        }
      },
    });
  }
}

