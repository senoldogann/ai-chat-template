/**
 * Hugging Face Provider - Qwen3-Omni and other Hugging Face models
 * Supports multimodal inputs (text, image, audio, video) via Inference API
 */

import { LLMProviderInterface, LLMRequest, LLMResponse, LLMStreamChunk, LLMProviderConfig } from './types';

export class HuggingFaceProvider implements LLMProviderInterface {
  name: 'huggingface' = 'huggingface';
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  validateConfig(config: LLMProviderConfig): boolean {
    // Hugging Face API token starts with 'hf_' or can be any string
    return !!config.apiKey;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model || 'Qwen/Qwen3-Omni-30B-A3B-Instruct';
    const baseURL = this.config.baseURL || 'https://router.huggingface.co/hf-inference';
    
    // Hugging Face Inference API endpoint
    // For Inference Endpoints (deployment), use: https://{endpoint-id}.{region}.inference.endpoints.huggingface.cloud
    // For Inference API (new router), use: https://router.huggingface.co/hf-inference/models/{model-id}
    let endpoint: string;
    if (baseURL.includes('inference.endpoints.huggingface.cloud')) {
      // Inference Endpoints (deployment) - use baseURL directly
      endpoint = baseURL;
    } else if (baseURL.includes('router.huggingface.co')) {
      // New router endpoint - append model path
      endpoint = `${baseURL}/models/${model}`;
    } else {
      // Legacy endpoint (deprecated) - append model path
      endpoint = `${baseURL}/models/${model}`;
    }

    // Convert messages to Hugging Face format
    // For Qwen3-Omni, we need to support multimodal inputs
    const messages = request.messages;
    
    // Build request body for Hugging Face Inference API
    // Qwen3-Omni uses a specific format for multimodal inputs
    const requestBody: any = {
      inputs: this.formatMessagesForHuggingFace(messages),
      parameters: {
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_new_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        return_full_text: false,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let content = '';
    if (Array.isArray(data)) {
      // If response is an array, get the first element
      content = data[0]?.generated_text || data[0]?.text || '';
    } else if (data.generated_text) {
      content = data.generated_text;
    } else if (data.text) {
      content = data.text;
    } else if (typeof data === 'string') {
      content = data;
    }

    return {
      content,
      model: model,
      usage: data.usage,
    };
  }

  async stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>> {
    const model = request.model || this.config.model || 'Qwen/Qwen3-Omni-30B-A3B-Instruct';
    const baseURL = this.config.baseURL || 'https://router.huggingface.co/hf-inference';
    
    // Hugging Face Inference API endpoint
    // For Inference Endpoints (deployment), use: https://{endpoint-id}.{region}.inference.endpoints.huggingface.cloud
    // For Inference API (new router), use: https://router.huggingface.co/hf-inference/models/{model-id}
    let endpoint: string;
    if (baseURL.includes('inference.endpoints.huggingface.cloud')) {
      // Inference Endpoints (deployment) - use baseURL directly
      endpoint = baseURL;
    } else if (baseURL.includes('router.huggingface.co')) {
      // New router endpoint - append model path
      endpoint = `${baseURL}/models/${model}`;
    } else {
      // Legacy endpoint (deprecated) - append model path
      endpoint = `${baseURL}/models/${model}`;
    }

    // Convert messages to Hugging Face format
    const messages = request.messages;
    
    // Build request body for Hugging Face Inference API
    const requestBody: any = {
      inputs: this.formatMessagesForHuggingFace(messages),
      parameters: {
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_new_tokens: request.max_tokens ?? this.config.defaultMaxTokens ?? 1000,
        return_full_text: false,
      },
      options: {
        wait_for_model: true,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Hugging Face API error: ${response.statusText}`);
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
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            // Hugging Face Inference API uses Server-Sent Events (SSE) format
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                controller.enqueue({ content: '', done: true });
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);
                
                // Handle different response formats
                let delta = '';
                if (json.token) {
                  // Token-by-token streaming
                  delta = json.token.text || '';
                } else if (json.generated_text) {
                  // Full generated text
                  const newText = json.generated_text;
                  delta = newText.slice(fullText.length);
                  fullText = newText;
                } else if (json.text) {
                  // Text response
                  const newText = json.text;
                  delta = newText.slice(fullText.length);
                  fullText = newText;
                }

                if (delta) {
                  controller.enqueue({
                    content: delta,
                    done: false,
                    model: model,
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            } else {
              // Try to parse as JSON directly (non-SSE format)
              try {
                const json = JSON.parse(line);
                if (json.generated_text || json.text) {
                  const content = json.generated_text || json.text;
                  controller.enqueue({
                    content: content,
                    done: true,
                    model: model,
                  });
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

  /**
   * Format messages for Hugging Face Inference API
   * Qwen3-Omni supports multimodal inputs (text, image, audio, video)
   */
  private formatMessagesForHuggingFace(messages: any[]): any {
    // For Qwen3-Omni, we need to format messages in a specific way
    // The model expects a conversation format with multimodal content
    
    // Get the last user message (most recent)
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return '';
    }

    // If message content is a string, return it directly
    if (typeof lastUserMessage.content === 'string') {
      return lastUserMessage.content;
    }

    // If message content is an array (multimodal), format it
    if (Array.isArray(lastUserMessage.content)) {
      // Build conversation format for Qwen3-Omni
      const conversation: any[] = [];
      
      // Add system message if exists
      const systemMessage = messages.find((m: any) => m.role === 'system');
      if (systemMessage) {
        conversation.push({
          role: 'system',
          content: typeof systemMessage.content === 'string' 
            ? systemMessage.content 
            : systemMessage.content.find((c: any) => c.type === 'text')?.text || '',
        });
      }

      // Add user message with multimodal content
      const userContent: any[] = [];
      for (const item of lastUserMessage.content) {
        if (item.type === 'text') {
          userContent.push({ type: 'text', text: item.text });
        } else if (item.type === 'image') {
          // Image can be URL or base64
          userContent.push({ 
            type: 'image', 
            image: item.image || item.url || item.src 
          });
        } else if (item.type === 'audio') {
          // Audio can be URL or base64
          userContent.push({ 
            type: 'audio', 
            audio: item.audio || item.url || item.src 
          });
        } else if (item.type === 'video') {
          // Video can be URL or base64
          userContent.push({ 
            type: 'video', 
            video: item.video || item.url || item.src 
          });
        }
      }

      conversation.push({
        role: 'user',
        content: userContent,
      });

      return conversation;
    }

    // Fallback: return as string
    return typeof lastUserMessage.content === 'string' 
      ? lastUserMessage.content 
      : JSON.stringify(lastUserMessage.content);
  }
}

