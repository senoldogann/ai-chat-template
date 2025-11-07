import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeInput } from '@/lib/prompt-sanitizer';
import { validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

// Get all chats
export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get first message for title
        },
      },
      take: 100, // Limit to 100 chats to prevent DoS
    });

    return Response.json(chats);
  } catch (error: unknown) {
    console.error('Error fetching chats:', error);
    return createErrorResponse(error);
  }
}

// Create a new chat
export async function POST(request: NextRequest) {
  try {
    // Safely parse request body - handle empty body
    let body: { title?: string } = {};
    try {
      const text = await request.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // If body is empty or invalid JSON, use empty object (title will be null)
      body = {};
    }
    
    let { title } = body;

    // Sanitize and validate title
    if (title) {
      title = sanitizeInput(title);
      
      // Validate title length
      const lengthValidation = validateMessageLength(title);
      if (!lengthValidation.valid) {
        return createErrorResponse(new Error(lengthValidation.error || 'Title too long'));
      }
      
      // Limit title length to 200 characters
      if (title.length > 200) {
        title = title.substring(0, 200);
      }
    }

    const chat = await prisma.chat.create({
      data: {
        title: title || null,
      },
    });

    return Response.json(chat);
  } catch (error: unknown) {
    console.error('Error creating chat:', error);
    return createErrorResponse(error);
  }
}

