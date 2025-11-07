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

    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
          num_predict: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Ollama API error: ${response.statusText}`);
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

    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
          num_predict: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        },
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Ollama API error: ${response.statusText}`);
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

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Final decode: if there's a value, decode it with stream: false
            // Then process any remaining buffer
            if (value) {
              // Decode final chunk with stream: false to ensure complete decoding
              buffer += decoder.decode(value, { stream: false });
            } else if (buffer.trim()) {
              // If no value but buffer exists, try to finalize buffer
              try {
                const finalDecoded = decoder.decode(new TextEncoder().encode(buffer), { stream: false });
                buffer = finalDecoded;
              } catch (e) {
                // If decode fails, use buffer as is
              }
            }
            
            // Process all remaining buffer content
            if (buffer.trim()) {
              const lines = buffer.split('\n').filter(line => line.trim());
              for (const line of lines) {
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
                    controller.close();
                    return;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
            
            // Send done signal
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
              if (delta) {
                controller.enqueue({
                  content: delta,
                  done: json.done || false,
                  model: json.model || model,
                });
              }
              if (json.done) {
                controller.close();
                return;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      },
    });
  }
}

