/**
 * Google Provider - Gemini models
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class GoogleProvider implements LLMProviderInterface {
  name: 'google' = 'google';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    return !!config.apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    const model = request.model || this.config.model || 'gemini-pro';

    // Google Gemini uses 'tools' parameter for function calling
    // Convert OpenAI format tools to Gemini format if provided
    const geminiTools = request.tools ? [{
      function_declarations: request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      })),
    }] : undefined;

    const response = await fetch(`${baseURL}/${model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: request.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        },
        // Add tools if provided (Google Gemini supports native function calling)
        ...(geminiTools && { tools: geminiTools }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: data.modelVersion || model,
      usage: data.usageMetadata,
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const baseURL = this.config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    const model = request.model || this.config.model || 'gemini-pro';

    const response = await fetch(`${baseURL}/${model}:streamGenerateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Google Gemini uses 'tools' parameter for function calling
      // Convert OpenAI format tools to Gemini format if provided
      const geminiTools = request.tools ? [{
        function_declarations: request.tools.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        })),
      }] : undefined;

      body: JSON.stringify({
        contents: request.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        },
        // Add tools if provided (Google Gemini supports native function calling)
        ...(geminiTools && { tools: geminiTools }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Google API error: ${response.statusText}`);
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
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue({
                  content: text,
                  done: false,
                  model: json.modelVersion || model,
                });
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

