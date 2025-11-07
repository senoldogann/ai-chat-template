import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMessage, sanitizeInput } from '@/lib/prompt-sanitizer';
import { TOOLS, ToolName } from '@/lib/tools';
import { validateMessageLength, validateArrayLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';
import { 
  createLLMProvider, 
  getProviderConfigFromEnv, 
  type LLMProvider 
} from '@/lib/llm/providers';

// Default API URLs for each provider (same as in lib/llm/providers/index.ts)
const DEFAULT_API_URLS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1',
  ollama: 'https://ollama.com/api',
  openrouter: 'https://openrouter.ai/api/v1',
  qrokcloud: 'https://api.qrokcloud.com/v1',
  'github-copilot': 'https://api.githubcopilot.com/v1',
  huggingface: 'https://router.huggingface.co/hf-inference',
};

/**
 * Get LLM provider instance
 * Supports: OpenAI, Anthropic, Google, Ollama, OpenRouter, QrokCloud, GitHub Copilot, Hugging Face
 * Requires provider to be configured with API key in UI or .env
 * Can use .env config or session overrides (from UI)
 */
function getLLMProvider(
  providerName?: string,
  sessionConfig?: { apiKey?: string; baseURL?: string; model?: string }
): { provider: unknown; providerName: LLMProvider } {
  // Provider must be explicitly specified
  if (!providerName) {
    throw new Error('No LLM provider specified. Please select a provider in the UI and configure it with an API key.');
  }
  
  // Get provider from request
  const requestedProvider = providerName as LLMProvider;
  
  // Get config from environment
  let config = getProviderConfigFromEnv(requestedProvider);
  
  // Debug: log config loading (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[getLLMProvider] Requested provider: ${requestedProvider}`);
    console.log(`[getLLMProvider] Config from env:`, config ? { hasApiKey: !!config.apiKey, baseURL: config.baseURL, model: config.model } : null);
  }
  
  // Override with session config if provided (from UI)
  if (sessionConfig) {
    // If session config has API key, use it
    if (sessionConfig.apiKey) {
      config = {
        ...config,
        apiKey: sessionConfig.apiKey,
        baseURL: sessionConfig.baseURL || config?.baseURL || DEFAULT_API_URLS[requestedProvider],
        model: sessionConfig.model || config?.model,
      };
      
      // Debug: log session config override (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getLLMProvider] Using session config with API key`);
      }
    } else if (config) {
      // If no session API key but env config exists, use env config
      config = {
        ...config,
        baseURL: sessionConfig.baseURL || config.baseURL,
        model: sessionConfig.model || config.model,
      };
    }
  }
  
  // If config is still null or invalid, throw error
  if (!config || !config.apiKey) {
    // Debug: log error reason (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLLMProvider] Config is null or missing API key`);
      console.log(`[getLLMProvider] Config:`, config);
      console.log(`[getLLMProvider] Environment variables:`, {
        HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? '***' : undefined,
        HF_API_KEY: process.env.HF_API_KEY ? '***' : undefined,
        HF_API: process.env.HF_API ? '***' : undefined,
      });
    }
    
    throw new Error(`Provider ${requestedProvider} is not configured. Please set ${requestedProvider.toUpperCase().replace('-', '_')}_API_KEY in environment variables or configure it in the UI.`);
  }

  // Create provider instance
  const provider = createLLMProvider(requestedProvider, config);
  
  // Validate config
  if (!provider.validateConfig(config)) {
    throw new Error(`Invalid configuration for provider ${requestedProvider}. Please check your API key and settings.`);
  }

  return { provider, providerName: requestedProvider };
}

/**
 * Convert tools to OpenAI function calling format
 * This allows AI to use native function calling capabilities
 */
function convertToolsToFunctionFormat() {
  return [
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Performs mathematical calculations with high precision. Use this for any math operations, calculations, or numerical computations.',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'The mathematical expression to evaluate (e.g., "2 + 2", "15 * 20", "100 / 5")',
            },
            precision: {
              type: 'number',
              description: 'Number of decimal places (optional, default: auto)',
            },
          },
          required: ['expression'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'searchWeb',
        description: 'Searches the web using DuckDuckGo (free, no API key). Use this for current events, recent information, real-time data, or anything that requires up-to-date information.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query (e.g., "latest Bitcoin news", "current weather in Istanbul")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (optional, default: 5)',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getStockPrice',
        description: 'Gets current stock price for a given symbol. Use this when user asks about stock prices.',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock symbol (e.g., "AAPL", "TSLA", "MSFT")',
            },
          },
          required: ['symbol'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getCryptoPrice',
        description: 'Gets current cryptocurrency price. Use this when user asks about crypto prices.',
        parameters: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g., "bitcoin", "ethereum", "btc", "eth")',
            },
          },
          required: ['symbol'],
        },
      },
    },
  ];
}

// Note: handleFunctionCall is kept for future use when native function calling is fully implemented
// Currently, tools are executed via detectToolUsage before sending to LLM

/**
 * Detect if user message requires a tool (legacy - kept for fallback)
 */
function detectToolUsage(message: string): { tool: ToolName | null; args: unknown } | null {
  const lowerMessage = message.toLowerCase();
  
  console.log(`[Tool Detection] Checking message: "${message}"`);
  
  // Check for generation keywords (unused but kept for future use)
  // const hasGenerationKeyword = /generate|create|draw|make|olustur|yarat|produce|render/.test(lowerMessage);
  
  // Calculator detection
  if (/calculate|compute|math|hesapla|hesap/.test(lowerMessage) && 
      /[\d+\-*/().]+/.test(message)) {
    const expression = message.match(/[\d+\-*/().\s]+/)?.[0]?.trim();
    if (expression) {
      return { tool: 'calculate', args: { expression } };
    }
  }
  
  // Web search detection - improved to catch "web search" at start or anywhere
  const hasWebSearchKeyword = /web\s+search|web\s+arama|web\s+ing|search|ara|find|bul|google|duckduckgo/.test(lowerMessage);
  const isNotCodeRelated = !/code|kod|programming/.test(lowerMessage);
  
  if (hasWebSearchKeyword && isNotCodeRelated) {
    // Extract query - remove search keywords and clean up
    // First, try to remove "web search" pattern specifically
    let query = message.replace(/web\s+search\s*/gi, '').trim();
    
    // If still contains other search keywords, remove them
    query = query.replace(/web\s+arama|web\s+ing|search|ara|find|bul|google|duckduckgo/gi, '').trim();
    
    // Remove common Turkish phrases
    query = query.replace(/benim\s+icin|bir|yapar\s+misin|bu\s+konuyla\s+ilgili/gi, '').trim();
    
    // If query is empty or too short, use the whole message (minus keywords)
    if (!query || query.length < 3) {
      // Try to extract meaningful query from the message
      query = message.replace(/web\s+search\s*|web\s+arama\s*|web\s+ing\s*/gi, '').trim();
      query = query.replace(/benim\s+icin|bir|yapar\s+misin|bu\s+konuyla\s+ilgili/gi, '').trim();
    }
    
    // Final check - if still empty, use original message minus keywords
    if (!query || query.length < 3) {
      query = message.replace(/web\s+search|web\s+arama|web\s+ing|search|ara|find|bul|google|duckduckgo/gi, '').trim();
    }
    
    if (query && query.length >= 3) {
      console.log(`[Tool Detection] Web search detected. Original: "${message}", Query: "${query}"`);
      return { tool: 'searchWeb', args: { query, maxResults: 5 } };
    }
  }
  
  // Stock price detection
  if (/stock|hisse|price|fiyat/.test(lowerMessage) && 
      /[A-Z]{1,5}/.test(message)) {
    const symbol = message.match(/[A-Z]{1,5}/)?.[0];
    if (symbol) {
      return { tool: 'getStockPrice', args: { symbol } };
    }
  }
  
  // Crypto price detection
  if (/crypto|bitcoin|ethereum|btc|eth|kripto/.test(lowerMessage)) {
    const cryptoMatch = message.match(/(bitcoin|ethereum|btc|eth|cardano|ada|solana|sol)/i);
    if (cryptoMatch) {
      const symbol = cryptoMatch[1].toLowerCase();
      return { tool: 'getCryptoPrice', args: { symbol } };
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messages: messagesInput, 
      temperature = 0.7, 
      max_tokens = 1000, 
      stream = true, 
      chatId,
      provider: requestedProvider,
      model: requestedModel,
      // Session config overrides (from UI)
      apiKey: sessionApiKey,
      baseURL: sessionBaseURL,
    } = body as {
      messages: unknown[];
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      chatId?: string;
      provider?: string;
      model?: string;
      apiKey?: string;
      baseURL?: string;
    };
    
    // Convert messages to typed array
    let messages: Array<{ role: string; content: string }> = (messagesInput as Array<{ role: string; content: string }>);

    // Validate messages array
    if (!Array.isArray(messages)) {
      return createErrorResponse(new Error('Messages must be an array'));
    }

    // Validate array length
    const arrayValidation = validateArrayLength(messages);
    if (!arrayValidation.valid) {
      return createErrorResponse(new Error(arrayValidation.error || 'Too many messages'));
    }

    // Validate temperature and max_tokens
    if (temperature < 0 || temperature > 2) {
      return createErrorResponse(new Error('Temperature must be between 0 and 2'));
    }

    if (max_tokens < 1 || max_tokens > 4000) {
      return createErrorResponse(new Error('Max tokens must be between 1 and 4000'));
    }

    // Validate and sanitize all user messages
    const sanitizedMessages = messages.map((msg: { role: string; content: string }) => {
      if (!msg || typeof msg !== 'object') {
        throw new Error('Invalid message format');
      }

      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        throw new Error('Invalid message role');
      }

      if (msg.role === 'user') {
        // Validate message length
        const lengthValidation = validateMessageLength(msg.content || '');
        if (!lengthValidation.valid) {
          throw new Error(lengthValidation.error || 'Message too long');
        }

        const validation = validateMessage(msg.content);
        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid message');
        }
        return {
          ...msg,
          content: validation.sanitized,
        };
      }
      // Sanitize assistant messages too (defense in depth)
      return {
        ...msg,
        content: sanitizeInput(msg.content || ''),
      };
    });
    
    // Update messages with sanitized version
    messages = sanitizedMessages;

    // Check if last user message requires a tool
    const lastUserMessage = sanitizedMessages.filter((m: { role: string; content: string }) => m.role === 'user').pop();
    if (lastUserMessage) {
      console.log(`[Tool Detection] Checking message: "${lastUserMessage.content}"`);
      const toolUsage = detectToolUsage(lastUserMessage.content);
      
      if (toolUsage && toolUsage.tool) {
        console.log(`[Tool Detection] Tool detected: ${toolUsage.tool}`, toolUsage.args);
        try {
          // Log tool usage for debugging
          console.log(`[Tool Detection] Using tool: ${toolUsage.tool}`, toolUsage.args);
          
          // Execute tool
          const tool = TOOLS[toolUsage.tool];
          // Type assertion for tool args (tools will validate their own args)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolResult = await tool.execute(toolUsage.args as any);
          
          // Log tool result for debugging
          if (toolUsage.tool === 'searchWeb') {
            const searchResult = toolResult as { query: string; results?: unknown[]; totalResults?: number; cached?: boolean };
            console.log(`[Web Search] Query: "${searchResult.query}"`, {
              resultsCount: searchResult.results?.length || 0,
              totalResults: searchResult.totalResults || 0,
              cached: searchResult.cached || false,
            });
          } else {
            console.log(`[Tool Result] ${toolUsage.tool}:`, toolResult);
          }
          
          // Format tool result for LLM based on tool type
          let toolContext = '';
          if (toolUsage.tool === 'searchWeb') {
            const searchResult = toolResult as { query: string; results?: unknown[]; totalResults?: number; cached?: boolean };
            if (searchResult.results && searchResult.results.length > 0) {
              toolContext = `Web Search Results for "${searchResult.query}":\n\n`;
              (searchResult.results as Array<{ title: string; url: string; snippet: string }>).forEach((result: { title: string; url: string; snippet: string }, index: number) => {
                toolContext += `${index + 1}. ${result.title}\n   URL: ${result.url}\n   ${result.snippet}\n\n`;
              });
              toolContext += `Use these search results to provide accurate and up-to-date information. If the results are limited, mention that and provide the best answer based on available information.`;
            } else {
              toolContext = `Web search for "${searchResult.query}" returned no results. The user may need to refine their search query or the information may not be available online. Provide a helpful response based on your knowledge.`;
            }
          } else {
            // For other tools, use JSON format
            toolContext = `Tool Result (${toolUsage.tool}): ${JSON.stringify(toolResult)}`;
          }
          
          // Add tool result to context
          messages.push({
            role: 'system',
            content: toolContext,
          });
        } catch (toolError: unknown) {
          // If tool fails, continue without it
          console.error('[Tool Execution Error]', toolUsage.tool, toolError);
          const errorMessage = toolError instanceof Error ? toolError.message : 'Unknown error';
          messages.push({
            role: 'system',
            content: `Tool execution failed: ${errorMessage}. Continue with normal response.`,
          });
        }
      }
    }

    // Get LLM provider (with session config overrides if provided)
    const { provider, providerName } = getLLMProvider(
      requestedProvider,
      sessionApiKey || sessionBaseURL ? {
        apiKey: sessionApiKey,
        baseURL: sessionBaseURL,
        model: requestedModel,
      } : undefined
    );

    // Convert messages to LLM format
    const llmMessages = (messages as Array<{ role: string; content: string }>).map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Convert tools to function calling format for AI
    const tools = convertToolsToFunctionFormat();

    // If streaming is requested, use provider stream
    if (stream) {
      // Note: User messages are saved by frontend via /api/chat/stream endpoint
      // We don't save them here to avoid duplicate messages
      // Title update is also handled by frontend for immediate UI update

      // Get stream from provider
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await (provider as any).stream({
        messages: llmMessages,
        temperature,
        max_tokens,
        model: body.model,
        tools: tools, // Add tools for native function calling
        tool_choice: 'auto', // Let AI decide when to use tools
      });

      // Convert to SSE format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          let buffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Process any remaining buffer before closing
                if (buffer.trim()) {
                  const lines = buffer.split('\n').filter(line => line.trim());
                  for (const line of lines) {
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                }
                
                
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }

              // Handle different stream formats
              if (typeof value === 'string') {
                // If value is already a string (SSE format)
                buffer += value;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.trim()) {
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                }
              } else if (value instanceof Uint8Array) {
                // If value is Uint8Array (binary data)
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.trim()) {
                    controller.enqueue(encoder.encode(line + '\n'));
                  }
                }
              } else if (value && typeof value === 'object') {
                // If value is an object (from other providers)
                if (value.content) {
                  const data = JSON.stringify({
                    choices: [{
                      delta: { content: value.content },
                    }],
                    model: value.model || providerName,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                if (value.done) {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  break;
                }
              }
            }
          } catch (error) {
            console.error('Error in stream processing:', error);
            // Send error as final message
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // If not streaming, use provider chat
    const llmResponse = await (provider as { chat: (request: { messages: unknown[]; temperature?: number; max_tokens?: number; model?: string }) => Promise<{ content: string }> }).chat({
      messages: llmMessages,
      temperature,
      max_tokens,
      model: body.model,
    });

    // Save assistant message to database if chatId is provided
    if (chatId && llmResponse.content) {
      await prisma.message.create({
        data: {
          role: 'assistant',
          content: llmResponse.content,
          chatId,
        },
      });
    }

    // Format response in OpenAI-compatible format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmResponseTyped = llmResponse as any;
    const response = {
      choices: [{
        message: {
          role: 'assistant',
          content: llmResponse.content,
        },
      }],
      model: llmResponseTyped.model || providerName,
      usage: llmResponseTyped.usage,
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return createErrorResponse(error);
  }
}

