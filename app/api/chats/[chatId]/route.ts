import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeInput } from '@/lib/prompt-sanitizer';
import { validateMessageLength } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

// Get a specific chat with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;

    // Validate chatId exists and is not empty
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return Response.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Note: Prisma uses CUID format (not UUID), so we only validate it's a non-empty string
    // CUID format: starts with 'c' followed by alphanumeric characters (e.g., 'clx1234567890abcdef')
    // We don't need strict format validation since Prisma will handle it

    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1000, // Limit messages to prevent DoS
          },
        },
      });

      if (!chat) {
        return Response.json({ error: 'Chat not found' }, { status: 404 });
      }

      return Response.json(chat);
    } catch (dbError: unknown) {
      console.error('Database error fetching chat:', dbError);
      // If it's a Prisma error, return a more specific error
      if (dbError instanceof Error) {
        return Response.json(
          { error: `Database error: ${dbError.message}` },
          { status: 500 }
        );
      }
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error: unknown) {
    console.error('Error fetching chat:', error);
    return createErrorResponse(error);
  }
}

// Update chat title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    
    // Validate chatId exists and is not empty
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return Response.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Note: Prisma uses CUID format (not UUID), so we only validate it's a non-empty string

    const body = await request.json();
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

    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });

    return Response.json(chat);
  } catch (error: unknown) {
    console.error('Error updating chat:', error);
    return createErrorResponse(error);
  }
}

// Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;

    // Validate chatId exists and is not empty
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      return Response.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Note: Prisma uses CUID format (not UUID), so we only validate it's a non-empty string
    // CUID format: starts with 'c' followed by alphanumeric characters (e.g., 'clx1234567890abcdef')
    // We don't need strict format validation since Prisma will handle it

    // Delete messages first (if cascade is not set in schema)
    try {
      await prisma.message.deleteMany({
        where: { chatId },
      });
    } catch (messageError) {
      // If messages don't exist or already deleted, continue
      console.warn('Error deleting messages (may not exist):', messageError);
    }

    // Delete chat
    try {
      await prisma.chat.delete({
        where: { id: chatId },
      });
    } catch (deleteError: unknown) {
      // If chat doesn't exist, return 404
      if (deleteError && typeof deleteError === 'object' && 'code' in deleteError) {
        const prismaError = deleteError as { code?: string };
        if (prismaError.code === 'P2025') {
          return Response.json({ error: 'Chat not found' }, { status: 404 });
        }
      }
      throw deleteError;
    }

    return Response.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting chat:', error);
    return createErrorResponse(error);
  }
}

