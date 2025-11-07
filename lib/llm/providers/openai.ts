/**
 * OpenAI Provider - GPT models
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class OpenAIProvider implements LLMProviderInterface {
  name: 'openai' = 'openai';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    return !!config.apiKey && config.apiKey.startsWith('sk-');
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = request.model || this.config.model || 'gpt-3.5-turbo';

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        stream: false,
        // Add tools if provided (OpenAI supports native function calling)
        ...(request.tools && { tools: request.tools }),
        ...(request.tool_choice && { tool_choice: request.tool_choice }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const baseURL = this.config.baseURL || 'https://api.openai.com/v1';
    const model = request.model || this.config.model || 'gpt-3.5-turbo';

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        stream: true,
        // Add tools if provided (OpenAI supports native function calling)
        ...(request.tools && { tools: request.tools }),
        ...(request.tool_choice && { tool_choice: request.tool_choice }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
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
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') {
                    controller.enqueue({ content: '', done: true });
                    controller.close();
                    return;
                  }

                  try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) {
                      controller.enqueue({
                        content: delta,
                        done: false,
                        model: json.model,
                      });
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue({ content: '', done: true });
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue({
                    content: delta,
                    done: false,
                    model: json.model,
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      },
    });
  }
}

