/**
 * LLM Provider Factory - Creates provider instances
 */

import { LLMProvider, LLMProviderInterface, LLMProviderConfig } from './types';

// Re-export types
export type { LLMProvider, LLMProviderInterface, LLMProviderConfig, LLMRequest, LLMResponse, LLMStreamChunk } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { OllamaProvider } from './ollama';
import { OpenRouterProvider } from './openrouter';
import { QrokCloudProvider } from './qrokcloud';
import { GitHubCopilotProvider } from './github-copilot';
import { HuggingFaceProvider } from './huggingface';

/**
 * Create LLM provider instance
 */
export function createLLMProvider(
  provider: LLMProvider,
  config: LLMProviderConfig
): LLMProviderInterface {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'google':
      return new GoogleProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'qrokcloud':
      return new QrokCloudProvider(config);
    case 'github-copilot':
      return new GitHubCopilotProvider(config);
    case 'huggingface':
      return new HuggingFaceProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get provider config from environment variables
 */
// Default API URLs for each provider
const DEFAULT_API_URLS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1',
  ollama: 'https://ollama.com/api', // Cloud URL (local: http://localhost:11434)
  openrouter: 'https://openrouter.ai/api/v1',
  qrokcloud: 'https://api.qrokcloud.com/v1',
  'github-copilot': 'https://api.githubcopilot.com/v1',
  huggingface: 'https://router.huggingface.co/hf-inference',
};

export function getProviderConfigFromEnv(provider: LLMProvider): LLMProviderConfig | null {
  const envKey = provider.toUpperCase().replace('-', '_');
  
  // For Hugging Face, also check HF_API_KEY and HF_API (common aliases)
  let apiKey = process.env[`${envKey}_API_KEY`];
  if (provider === 'huggingface' && !apiKey) {
    apiKey = process.env.HF_API_KEY || process.env.HF_API;
  }
  
  const baseURL = process.env[`${envKey}_BASE_URL`] || DEFAULT_API_URLS[provider];
  const model = process.env[`${envKey}_MODEL`];
  const temperature = process.env[`${envKey}_TEMPERATURE`];
  const maxTokens = process.env[`${envKey}_MAX_TOKENS`];

  // For Ollama, if API key is provided, use cloud URL; otherwise use local URL
  let finalBaseURL = baseURL;
  if (provider === 'ollama') {
    if (apiKey) {
      // Cloud mode - use cloud URL
      finalBaseURL = process.env[`${envKey}_BASE_URL`] || 'https://ollama.com/api';
    } else {
      // Local mode - use local URL
      finalBaseURL = process.env[`${envKey}_BASE_URL`] || 'http://localhost:11434';
    }
  }

  // All providers now require API key (Ollama local doesn't need API key, but cloud does)
  if (!apiKey && provider !== 'ollama') {
    return null;
  }

  return {
    apiKey: apiKey || '',
    baseURL: finalBaseURL || DEFAULT_API_URLS[provider],
    model: model || undefined,
    defaultTemperature: temperature ? parseFloat(temperature) : undefined,
    defaultMaxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
  };
}

/**
 * Get default provider from environment
 */
export function getDefaultProvider(): LLMProvider | null {
  const provider = process.env.LLM_PROVIDER as LLMProvider;
  if (provider && ['openai', 'anthropic', 'google', 'ollama', 'openrouter', 'qrokcloud', 'github-copilot', 'huggingface'].includes(provider)) {
    return provider;
  }
  return null;
}

/**
 * Get available providers
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  
  for (const provider of ['openai', 'anthropic', 'google', 'ollama', 'openrouter', 'qrokcloud', 'github-copilot', 'huggingface'] as LLMProvider[]) {
    const config = getProviderConfigFromEnv(provider);
    if (config) {
      const instance = createLLMProvider(provider, config);
      if (instance.validateConfig(config)) {
        providers.push(provider);
      }
    }
  }
  
  return providers;
}

