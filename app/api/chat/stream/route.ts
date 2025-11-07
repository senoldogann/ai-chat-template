import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMessage, sanitizeInput } from '@/lib/prompt-sanitizer';
import { validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

// Save streaming message to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { chatId, role, content } = body;

    // Validate required fields
    if (!chatId || !role || !content) {
      return Response.json({ error: 'chatId, role, and content are required' }, { status: 400 });
    }

    // Validate chatId is a non-empty string (Prisma uses CUID format)
    if (typeof chatId !== 'string' || chatId.trim() === '') {
      return Response.json({ error: 'Invalid chatId format' }, { status: 400 });
    }

    // Validate content is a non-empty string
    if (typeof content !== 'string' || content.trim() === '') {
      return Response.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Validate role
    if (!['user', 'assistant', 'system'].includes(role)) {
      return createErrorResponse(new Error('Invalid message role'));
    }

    // Validate message length
    const lengthValidation = validateMessageLength(content);
    if (!lengthValidation.valid) {
      return Response.json({ error: lengthValidation.error || 'Message too long' }, { status: 400 });
    }

    // Validate and sanitize user messages
    if (role === 'user') {
      const validation = validateMessage(content);
      if (!validation.valid) {
        return Response.json({ error: validation.error || 'Invalid message' }, { status: 400 });
      }
      content = validation.sanitized;
    } else {
      // Sanitize assistant messages too
      content = sanitizeInput(content);
    }

    // Check if chat exists
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        role,
        content,
        chatId,
      },
    });

    return Response.json(message);
  } catch (error: unknown) {
    console.error('Error saving message:', error);
    
    // Handle Prisma errors specifically
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string };
      
      // Foreign key constraint error (chatId doesn't exist)
      if (prismaError.code === 'P2003') {
        return Response.json({ error: 'Chat not found' }, { status: 404 });
      }
      
      // Unique constraint error
      if (prismaError.code === 'P2002') {
        return Response.json({ error: 'Message already exists' }, { status: 409 });
      }
      
      // Record not found
      if (prismaError.code === 'P2025') {
        return Response.json({ error: 'Chat not found' }, { status: 404 });
      }
    }
    
    return createErrorResponse(error);
  }
}

