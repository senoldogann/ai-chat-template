/**
 * LLM Provider Types - Unified interface for all LLM providers
 */

export type LLMProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'openrouter'
  | 'qrokcloud'
  | 'github-copilot'
  | 'huggingface';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  model?: string;
  tools?: LLMTool[]; // Tools for function calling (OpenAI format)
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }; // Tool choice (OpenAI format)
}

export interface LLMResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  model?: string;
}

export interface LLMProviderConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export interface LLMProviderInterface {
  name: LLMProvider;
  chat(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>>;
  validateConfig(config: LLMProviderConfig): boolean;
}

