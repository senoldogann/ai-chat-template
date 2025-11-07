import { NextRequest } from 'next/server';
import { getProviderConfigFromEnv, createLLMProvider, type LLMProvider } from '@/lib/llm/providers';

/**
 * Get available models for a specific provider
 * Fetches models dynamically from the provider's API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam as LLMProvider;
    
    // Get provider config from environment or request
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const baseURL = searchParams.get('baseURL');
    
    let config = getProviderConfigFromEnv(provider);
    
    // Override with request parameters if provided
    if (apiKey || baseURL) {
      config = {
        ...config,
        apiKey: apiKey || config?.apiKey || '',
        baseURL: baseURL || config?.baseURL || undefined,
      };
    }
    
    if (!config || !config.apiKey) {
      // For Ollama local, we can still fetch models without API key
      if (provider === 'ollama' && !config?.apiKey) {
        // If baseURL is provided and contains 'ollama.com', use it (cloud)
        // Otherwise use localhost (local)
        const ollamaBaseURL = baseURL || (config?.baseURL?.includes('ollama.com') ? config.baseURL : 'http://localhost:11434');
        config = {
          apiKey: '',
          baseURL: ollamaBaseURL,
        };
      } else {
        return Response.json(
          { error: `Provider ${provider} is not configured. Please provide an API key.` },
          { status: 400 }
        );
      }
    }
    
    // Fetch models from provider API
    const models = await fetchModelsFromProvider(provider, config);
    
    return Response.json({
      provider,
      models,
    });
  } catch (error: any) {
    const { provider: providerParam } = await params;
    console.error(`[Models API] Error fetching models for ${providerParam}:`, error);
    return Response.json(
      { error: error.message || 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

/**
 * Fetch models from provider API
 */
async function fetchModelsFromProvider(
  provider: LLMProvider,
  config: { apiKey: string; baseURL?: string }
): Promise<string[]> {
  // Use config.baseURL if provided, otherwise use default
  const baseURL = config.baseURL || getDefaultBaseURL(provider);
  
  try {
    switch (provider) {
      case 'openai': {
        const response = await fetch(`${baseURL}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        // Filter for chat models (gpt-* models)
        return data.data
          ?.filter((model: any) => model.id.startsWith('gpt-') || model.id.startsWith('o1-'))
          ?.map((model: any) => model.id)
          ?.sort() || [];
      }
      
      case 'anthropic': {
        // Anthropic doesn't have a models endpoint, return known models
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      }
      
      case 'google': {
        // Google doesn't have a models endpoint, return known models
        return [
          'gemini-2.0-flash-exp',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-pro',
        ];
      }
      
      case 'ollama': {
        // Ollama API endpoint: /api/tags for local, /tags for cloud
        // For cloud, baseURL should be https://ollama.com/api
        // For local, baseURL should be http://localhost:11434
        const ollamaBaseURL = baseURL || (config.apiKey ? 'https://ollama.com/api' : 'http://localhost:11434');
        
        // Determine the correct endpoint based on baseURL
        // If baseURL includes 'ollama.com', it's cloud and endpoint is /tags
        // If baseURL is localhost, it's local and endpoint is /api/tags
        const isCloud = ollamaBaseURL.includes('ollama.com');
        const endpoint = isCloud ? '/tags' : '/api/tags';
        
        const response = await fetch(`${ollamaBaseURL}${endpoint}`, {
          headers: config.apiKey ? {
            'Authorization': `Bearer ${config.apiKey}`,
          } : undefined,
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        return data.models?.map((model: any) => model.name) || [];
      }
      
      case 'openrouter': {
        const response = await fetch(`${baseURL}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'HTTP-Referer': 'https://github.com/yourusername/ai-chat-template',
            'X-Title': 'AI Chat Template',
          },
        });
        
        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data?.map((model: any) => model.id) || [];
      }
      
      case 'huggingface': {
        // Hugging Face doesn't have a simple models endpoint
        // Return popular models or fetch from API if available
        return [
          'Qwen/Qwen3-Omni-30B-A3B-Instruct',
          'Qwen/Qwen3-Omni-30B-A3B-Thinking',
          'Qwen/Qwen3-Omni-30B-A3B-Captioner',
          'Qwen/Qwen2.5-72B-Instruct',
          'Qwen/Qwen2.5-32B-Instruct',
          'Qwen/Qwen2.5-14B-Instruct',
          'meta-llama/Llama-3.1-70B-Instruct',
          'meta-llama/Llama-3.1-8B-Instruct',
          'mistralai/Mistral-7B-Instruct-v0.2',
          'google/gemma-7b-it',
        ];
      }
      
      case 'qrokcloud': {
        // QrokCloud doesn't have a models endpoint, return default
        return ['default'];
      }
      
      case 'github-copilot': {
        // GitHub Copilot doesn't have a models endpoint, return known models
        return ['gpt-4', 'gpt-3.5-turbo'];
      }
      
      default:
        return [];
    }
  } catch (error: any) {
    console.error(`[Models API] Error fetching models for ${provider}:`, error);
    throw error;
  }
}

/**
 * Get default base URL for provider
 */
function getDefaultBaseURL(provider: LLMProvider): string {
  const defaultURLs: Record<LLMProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1',
    ollama: 'http://localhost:11434',
    openrouter: 'https://openrouter.ai/api/v1',
    qrokcloud: 'https://api.qrokcloud.com/v1',
    'github-copilot': 'https://api.githubcopilot.com/v1',
    huggingface: 'https://router.huggingface.co/hf-inference',
  };
  
  return defaultURLs[provider];
}

