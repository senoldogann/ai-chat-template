/**
 * GitHub Copilot Provider
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class GitHubCopilotProvider implements LLMProviderInterface {
  name: 'github-copilot' = 'github-copilot';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    return !!config.apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const baseURL = this.config.baseURL || 'https://api.githubcopilot.com/v1';
    const model = request.model || this.config.model || 'gpt-4';

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
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `GitHub Copilot API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const baseURL = this.config.baseURL || 'https://api.githubcopilot.com/v1';
    const model = request.model || this.config.model || 'gpt-4';

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
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `GitHub Copilot API error: ${response.statusText}`);
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

        controller.close();
      },
    });
  }
}

