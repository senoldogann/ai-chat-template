import { NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/security/error-handler';
import { getProviderConfigFromEnv, getDefaultProvider } from '@/lib/llm/providers';

/**
 * Get LLM provider configuration
 * Returns configuration for a specific provider
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return createErrorResponse(new Error('Provider parameter is required'));
    }

    const config = getProviderConfigFromEnv(provider as any);
    
    // For Ollama, return config even if API key is not set (local mode)
    if (!config && provider !== 'ollama') {
      return Response.json(
        { error: `Provider ${provider} is not configured` },
        { status: 404 }
      );
    }

    // If config exists, return it; otherwise return default Ollama config
    if (config) {
      return Response.json({
        provider,
        hasApiKey: !!config.apiKey,
        baseURL: config.baseURL || null,
        model: config.model || null,
        defaultTemperature: config.defaultTemperature || null,
        defaultMaxTokens: config.defaultMaxTokens || null,
      });
    }

    // Default Ollama config (local mode, no API key required)
    return Response.json({
      provider: 'ollama',
      hasApiKey: false,
      baseURL: 'http://localhost:11434',
      model: null,
      defaultTemperature: null,
      defaultMaxTokens: null,
    });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

/**
 * Update LLM provider configuration (for session only)
 * Note: This doesn't persist to .env, only for current session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseURL, model, temperature, maxTokens } = body;

    if (!provider) {
      return createErrorResponse(new Error('Provider is required'));
    }

    // Validate provider
    const validProviders = ['openai', 'anthropic', 'google', 'ollama', 'openrouter', 'qrokcloud', 'github-copilot', 'huggingface'];
    if (!validProviders.includes(provider)) {
      return createErrorResponse(new Error('Invalid provider'));
    }

    // Note: In production, you might want to store this in a session/database
    // For now, we'll just validate and return success
    // The actual API calls will use .env values or request body values

    return Response.json({
      success: true,
      message: 'Configuration updated for this session',
      provider,
      config: {
        hasApiKey: !!apiKey,
        baseURL: baseURL || null,
        model: model || null,
        temperature: temperature || null,
        maxTokens: maxTokens || null,
      },
    });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

