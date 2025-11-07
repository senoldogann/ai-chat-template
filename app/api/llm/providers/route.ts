import { NextRequest } from 'next/server';
import { getAvailableProviders, getDefaultProvider } from '@/lib/llm/providers';

/**
 * Get available LLM providers
 */
export async function GET() {
  try {
    const availableProviders = getAvailableProviders();
    const defaultProvider = getDefaultProvider();

    return Response.json({
      available: availableProviders,
      default: defaultProvider,
      providers: {
        openai: {
          name: 'OpenAI',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://api.openai.com/v1',
          envKey: 'OPENAI_API_KEY',
        },
        anthropic: {
          name: 'Anthropic',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://api.anthropic.com/v1',
          envKey: 'ANTHROPIC_API_KEY',
        },
        google: {
          name: 'Google',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://generativelanguage.googleapis.com/v1',
          envKey: 'GOOGLE_API_KEY',
        },
        ollama: {
          name: 'Ollama',
          models: [], // Models will be fetched dynamically from API (local or cloud)
          apiUrl: 'https://ollama.com/api', // Cloud URL (local: http://localhost:11434)
          envKey: 'OLLAMA_API_KEY',
        },
        openrouter: {
          name: 'OpenRouter',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://openrouter.ai/api/v1',
          envKey: 'OPENROUTER_API_KEY',
        },
        qrokcloud: {
          name: 'QrokCloud',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://api.qrokcloud.com/v1',
          envKey: 'QROKCLOUD_API_KEY',
        },
        'github-copilot': {
          name: 'GitHub Copilot',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://api.githubcopilot.com/v1',
          envKey: 'GITHUB_COPILOT_API_KEY',
        },
        huggingface: {
          name: 'Hugging Face',
          models: [], // Models will be fetched dynamically from API
          apiUrl: 'https://router.huggingface.co/hf-inference',
          envKey: 'HUGGINGFACE_API_KEY',
        },
      },
    });
  } catch (error: unknown) {
    return Response.json(
      { error: 'Failed to get providers' },
      { status: 500 }
    );
  }
}

