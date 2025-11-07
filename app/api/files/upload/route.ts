import { NextRequest } from 'next/server';
import { sanitizeFilename } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  text: ['text/plain', 'text/csv'],
};

/**
 * File Upload API - Upload and process files for AI
 * Supports images, PDFs, and text files
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // chatId is not used in this endpoint, but kept for future use
    const _chatId = formData.get('chatId') as string;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    const fileType = file.type;

    // Validate file type
    const isAllowed = 
      ALLOWED_TYPES.image.includes(fileType) ||
      ALLOWED_TYPES.document.includes(fileType) ||
      ALLOWED_TYPES.text.includes(fileType);

    if (!isAllowed) {
      return Response.json(
        { error: 'File type not supported. Allowed types: images, PDF, text files' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process file based on type
    let fileContent: string = '';
    const fileMetadata: {
      name: string;
      type: string;
      size: number;
      format?: string;
      dataUrl?: string;
      truncated?: boolean;
    } = {
      name: sanitizedFilename,
      type: fileType,
      size: file.size,
    };

    if (ALLOWED_TYPES.image.includes(fileType)) {
      // For images, convert to base64
      fileContent = buffer.toString('base64');
      fileMetadata.format = 'base64';
      fileMetadata.dataUrl = `data:${fileType};base64,${fileContent}`;
    } else if (ALLOWED_TYPES.document.includes(fileType) || ALLOWED_TYPES.text.includes(fileType)) {
      // For text-based files, read as text
      try {
        fileContent = buffer.toString('utf-8');
        fileMetadata.format = 'text';
        // Limit text content to 100KB for processing
        if (fileContent.length > 100 * 1024) {
          fileContent = fileContent.substring(0, 100 * 1024);
          fileMetadata.truncated = true;
        }
      } catch (_error) {
        return Response.json(
          { error: 'Failed to read file content' },
          { status: 400 }
        );
      }
    }

    return Response.json({
      success: true,
      file: {
        name: sanitizedFilename,
        type: fileType,
        size: file.size,
        content: fileContent,
        metadata: fileMetadata,
      },
    });
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    return createErrorResponse(error);
  }
}

