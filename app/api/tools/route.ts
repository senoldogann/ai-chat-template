import { NextRequest } from 'next/server';
import { TOOLS, ToolName } from '@/lib/tools';
import { rateLimiter, getRateLimitIdentifier } from '@/lib/utils/rate-limiter';

/**
 * Tools API - Handles tool execution requests
 * All tools are free, no paid APIs required
 * Enhanced with rate limiting
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (60 requests per minute per IP)
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = rateLimiter.isAllowed(identifier, 60, 60 * 1000);
    
    if (!rateLimit.allowed) {
      return Response.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { toolName, args } = body;

    if (!toolName || !TOOLS[toolName as ToolName]) {
      return Response.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 400 }
      );
    }

    const tool = TOOLS[toolName as ToolName];
    const result = await tool.execute(args);

    return Response.json({
      success: true,
      tool: toolName,
      result,
    }, {
      headers: {
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      },
    });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return Response.json(
      { error: error.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}

/**
 * Get available tools
 */
export async function GET() {
  const availableTools = Object.keys(TOOLS).map((name) => {
    const tool = TOOLS[name as ToolName];
    return {
      name: tool.name,
      description: tool.description,
    };
  });

  return Response.json({
    tools: availableTools,
  });
}

