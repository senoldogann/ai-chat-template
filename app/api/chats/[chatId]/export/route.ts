import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/security/error-handler';

/**
 * Export chat conversation in different formats (PDF, Markdown, JSON)
 * GET /api/chats/[chatId]/export?format=pdf|markdown|json
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Validate format
    if (!['pdf', 'markdown', 'json'].includes(format)) {
      return Response.json(
        { error: 'Invalid format. Supported formats: pdf, markdown, json' },
        { status: 400 }
      );
    }

    // Fetch chat with messages
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Export based on format
    switch (format) {
      case 'json':
        return exportJSON(chat);
      case 'markdown':
        return exportMarkdown(chat);
      case 'pdf':
        return exportPDF(chat);
      default:
        return Response.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Export error:', error);
    return createErrorResponse(error);
  }
}

/**
 * Export chat as JSON
 */
function exportJSON(chat: {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}) {
  const exportData = {
    chat: {
      id: chat.id,
      title: chat.title || 'Untitled Chat',
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      messageCount: chat.messages.length,
    },
    messages: chat.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    })),
  };

  return Response.json(exportData, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chat-${chat.id}.json"`,
    },
  });
}

/**
 * Export chat as Markdown
 */
function exportMarkdown(chat: {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}) {
  const title = chat.title || 'Untitled Chat';
  const date = new Date(chat.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date(chat.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let markdown = `# ${title}\n\n`;
  markdown += `**Date:** ${date} at ${time}\n`;
  markdown += `**Message Count:** ${chat.messages.length}\n\n`;
  markdown += `---\n\n`;

  // Add messages
  chat.messages.forEach((msg) => {
    const messageDate = new Date(msg.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Escape markdown special characters in content
    const escapedContent = msg.content
      .replace(/\n/g, '\n\n') // Double newlines for paragraph breaks
      .replace(/\*\*/g, '\\*\\*') // Escape bold
      .replace(/\*/g, '\\*') // Escape italic
      .replace(/#/g, '\\#') // Escape headers
      .replace(/\[/g, '\\[') // Escape links
      .replace(/\]/g, '\\]'); // Escape links

    if (msg.role === 'user') {
      markdown += `## 👤 User (${messageDate})\n\n`;
    } else if (msg.role === 'assistant') {
      markdown += `## 🤖 Assistant (${messageDate})\n\n`;
    } else {
      markdown += `## ${msg.role} (${messageDate})\n\n`;
    }

    markdown += `${escapedContent}\n\n`;
    markdown += `---\n\n`;
  });

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="chat-${chat.id}.md"`,
    },
  });
}

/**
 * Export chat as PDF using Puppeteer
 * Generates PDF from print-friendly page with proper Turkish character support
 */
async function exportPDF(chat: {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}) {
  try {
    // Import puppeteer dynamically
    const puppeteer = await import('puppeteer');
    
    // Get base URL from environment or use default
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const printUrl = `${baseUrl}/print/${chat.id}`;
    
    // Launch browser
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport to ensure proper rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
      });
      
      // Navigate to print page
      await page.goto(printUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      
      // Wait for content to load
      await page.waitForSelector('.print-main', { timeout: 5000 }).catch(() => {});
      
      // Get content height to avoid extra space
      const contentHeight = await page.evaluate(() => {
        const main = document.querySelector('.print-main');
        return main ? main.scrollHeight : 0;
      });
      
      // Generate PDF with optimized margins and content-based height
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm',
        },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        omitBackground: false,
      });
      
      // Close browser
      await browser.close();
      
      // Return PDF as Buffer
      return new Response(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="chat-${chat.id}.pdf"`,
        },
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    // Fallback: return error message
    return Response.json(
      { error: 'PDF oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}

