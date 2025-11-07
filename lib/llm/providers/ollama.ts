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

    const response = await fetch(`${baseURL}/api/chat`, {
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

    const response = await fetch(`${baseURL}/api/chat`, {
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
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
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

        controller.close();
      },
    });
  }
}

