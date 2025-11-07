/**
 * Anthropic Provider - Claude models
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class AnthropicProvider implements LLMProviderInterface {
  name: 'anthropic' = 'anthropic';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    return !!config.apiKey && config.apiKey.startsWith('sk-ant-');
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || 'https://api.anthropic.com/v1';
    const model = request.model || this.config.model || 'claude-3-5-sonnet-20241022';

    const response = await fetch(`${baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      // Anthropic uses 'tools' parameter for function calling (Claude 3.5+)
      // Convert OpenAI format tools to Anthropic format if provided
      const anthropicTools = request.tools ? request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      })) : undefined;

      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        // Add tools if provided (Anthropic supports native function calling)
        ...(anthropicTools && anthropicTools.length > 0 && { tools: anthropicTools }),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: {
        prompt_tokens: data.usage?.input_tokens,
        completion_tokens: data.usage?.output_tokens,
        total_tokens: data.usage?.input_tokens + data.usage?.output_tokens,
      },
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const baseURL = this.config.baseURL || 'https://api.anthropic.com/v1';
    const model = request.model || this.config.model || 'claude-3-5-sonnet-20241022';

    const response = await fetch(`${baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.statusText}`);
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue({ content: '', done: true });
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);
                if (json.type === 'content_block_delta') {
                  const delta = json.delta?.text;
                  if (delta) {
                    controller.enqueue({
                      content: delta,
                      done: false,
                      model: json.model,
                    });
                  }
                } else if (json.type === 'message_stop') {
                  controller.enqueue({ content: '', done: true });
                  controller.close();
                  return;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        controller.close();
      },
    });
  }
}

