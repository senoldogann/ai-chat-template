import { NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/security/error-handler';
import { validateMessageLength } from '@/lib/security/validation';
import { sanitizeInput } from '@/lib/prompt-sanitizer';
import { 
  createLLMProvider, 
  getProviderConfigFromEnv, 
  getDefaultProvider,
  type LLMProvider 
} from '@/lib/llm/providers';

/**
 * Improve/rewrite user prompt to be more clear and AI-friendly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return createErrorResponse(new Error('Prompt is required'));
    }

    // Validate message length
    const lengthValidation = validateMessageLength(prompt);
    if (!lengthValidation.valid) {
      return createErrorResponse(new Error(lengthValidation.error || 'Prompt too long'));
    }

    // Sanitize input
    const sanitizedPrompt = sanitizeInput(prompt);

    if (!sanitizedPrompt.trim()) {
      return createErrorResponse(new Error('Prompt cannot be empty'));
    }

    // System message to improve the prompt
    const systemMessage = `You are a prompt improvement assistant. Your task is to rewrite the user's prompt to make it clearer, more specific, and easier for an AI to understand and respond to. 

Rules:
- Keep the original intent and meaning
- Make it more professional and clear
- Add necessary context if missing
- Use proper grammar and structure
- Keep it concise but complete
- Return ONLY the improved prompt, no explanations or additional text

Original prompt: "${sanitizedPrompt}"`;

    // Get default provider or use OpenAI as fallback
    const defaultProvider = getDefaultProvider() || 'openai';
    const providerName = defaultProvider as LLMProvider;
    
    // Get provider config from environment
    let config = getProviderConfigFromEnv(providerName);
    
    if (!config || !config.apiKey) {
      return Response.json(
        { error: 'LLM provider yapılandırılmamış. Lütfen bir provider yapılandırın ve API key girin.' },
        { status: 400 }
      );
    }

    // Create provider instance
    const provider = createLLMProvider(providerName, config);
    
    // Validate config
    if (!provider.validateConfig(config)) {
      return Response.json(
        { error: 'Provider yapılandırması geçersiz. Lütfen API key ve ayarlarınızı kontrol edin.' },
        { status: 400 }
      );
    }

    // Call LLM to improve the prompt
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: 'Please improve this prompt for better AI understanding.' }
    ];

    // Call provider to improve the prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (provider as any).chat({
      messages,
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 500,
    });

    if (!response || !response.content) {
      return Response.json(
        { error: 'Prompt iyileştirilemedi. AI yanıt vermedi.' },
        { status: 500 }
      );
    }

    // Extract improved prompt (remove any quotes or extra formatting)
    let improvedPrompt = response.content.trim();
    
    // Remove surrounding quotes if present
    if ((improvedPrompt.startsWith('"') && improvedPrompt.endsWith('"')) ||
        (improvedPrompt.startsWith("'") && improvedPrompt.endsWith("'"))) {
      improvedPrompt = improvedPrompt.slice(1, -1);
    }

    return Response.json({
      improved: improvedPrompt,
      original: sanitizedPrompt,
    });
  } catch (error: unknown) {
    console.error('Error in prompt improvement:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('No LLM provider configured')) {
        return Response.json(
          { error: 'LLM provider yapılandırılmamış. Lütfen bir provider yapılandırın.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('API error')) {
        return Response.json(
          { error: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Failed to improve prompt')) {
        return Response.json(
          { error: 'Prompt iyileştirilemedi. Lütfen tekrar deneyin.' },
          { status: 500 }
        );
      }
    }
    
    // Fallback to generic error handler
    return createErrorResponse(error);
  }
}

