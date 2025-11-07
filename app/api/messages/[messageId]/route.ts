import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/security/error-handler';

// Delete a specific message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    // Validate messageId exists and is not empty
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      return Response.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Note: Prisma uses CUID format (not UUID), so we only validate it's a non-empty string

    try {
      // Delete the message
      await prisma.message.delete({
        where: { id: messageId },
      });

      return Response.json({ success: true });
    } catch (deleteError: any) {
      // If message doesn't exist, return 404
      if (deleteError?.code === 'P2025') {
        return Response.json({ error: 'Message not found' }, { status: 404 });
      }
      throw deleteError;
    }
  } catch (error: unknown) {
    console.error('Error deleting message:', error);
    return createErrorResponse(error);
  }
}

