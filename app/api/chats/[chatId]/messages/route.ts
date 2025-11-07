import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateMessage, sanitizeInput } from '@/lib/prompt-sanitizer';
import { validateUUID, validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

// Add a message to a chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    
    // Validate UUID format
    if (!validateUUID(chatId)) {
      return createErrorResponse(new Error('Invalid chat ID format'));
    }

    const body = await request.json();
    let { role, content } = body;

    // Validate required fields
    if (!role || !content) {
      return Response.json({ error: 'Role and content are required' }, { status: 400 });
    }

    // Validate role
    if (!['user', 'assistant', 'system'].includes(role)) {
      return createErrorResponse(new Error('Invalid message role'));
    }

    // Validate content type
    if (typeof content !== 'string') {
      return createErrorResponse(new Error('Message content must be a string'));
    }

    // Validate message length
    const lengthValidation = validateMessageLength(content);
    if (!lengthValidation.valid) {
      return createErrorResponse(new Error(lengthValidation.error || 'Message too long'));
    }

    // Validate and sanitize message
    if (role === 'user') {
      const validation = validateMessage(content);
      if (!validation.valid) {
        return Response.json(
          { error: validation.error || 'Invalid message' },
          { status: 400 }
        );
      }
      content = validation.sanitized;
    } else {
      content = sanitizeInput(content || '');
    }

    const message = await prisma.message.create({
      data: {
        role,
        content,
        chatId,
      },
    });

    // Update chat title if it's the first user message
    if (role === 'user') {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { messages: true },
      });

      if (chat) {
        const userMessages = chat.messages.filter((msg: { role: string }) => msg.role === 'user');
        if (userMessages.length === 1) {
          // First message, use it as title (truncated to 200 chars)
          const title = content.length > 200 ? content.substring(0, 200) : content;
          await prisma.chat.update({
            where: { id: chatId },
            data: { title },
          });
        }
      }
    }

    return Response.json(message);
  } catch (error: unknown) {
    console.error('Error creating message:', error);
    return createErrorResponse(error);
  }
}

