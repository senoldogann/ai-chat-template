import { NextRequest } from 'next/server';
import { processCSV, processExcel, analyzeFinancialData } from '@/lib/tools/file-processor';
import { validateFileSize, validateFileType, sanitizeFilename } from '@/lib/security/validation';
import { createErrorResponse } from '@/lib/security/error-handler';

/**
 * File Upload API - Process CSV and Excel files
 * Enhanced with security validation
 */

const ALLOWED_FILE_TYPES = ['csv', 'xlsx', 'xls'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const analyze = formData.get('analyze') === 'true';

    if (!file) {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.valid) {
      return Response.json(
        { error: sizeValidation.error },
        { status: 413 }
      );
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    const fileType = sanitizedFilename.split('.').pop()?.toLowerCase();

    // Validate file type
    if (!fileType) {
      return Response.json(
        { error: 'File must have an extension' },
        { status: 400 }
      );
    }

    const typeValidation = validateFileType(sanitizedFilename, ALLOWED_FILE_TYPES);
    if (!typeValidation.valid) {
      return Response.json(
        { error: typeValidation.error },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Additional size check after reading
    if (buffer.length > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    let fileData;

    try {
      if (fileType === 'csv') {
        const csvContent = buffer.toString('utf-8');
        fileData = processCSV(csvContent);
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        fileData = processExcel(buffer);
      } else {
        return Response.json(
          { error: 'Unsupported file type. Please upload CSV or Excel files.' },
          { status: 400 }
        );
      }
    } catch (processingError: any) {
      return Response.json(
        { error: `File processing error: ${processingError.message}` },
        { status: 400 }
      );
    }

    let analysis = null;
    if (analyze) {
      try {
        analysis = analyzeFinancialData(fileData);
      } catch (analysisError: any) {
        // Analysis failed but file was processed successfully
        console.error('Analysis error:', analysisError);
      }
    }

    return Response.json({
      success: true,
      data: fileData,
      analysis,
    });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

