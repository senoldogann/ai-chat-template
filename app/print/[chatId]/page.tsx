'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Print-friendly page for chat export
 * This page is optimized for PDF generation with Puppeteer
 */
export default function PrintChatPage() {
  const params = useParams();
  const chatId = params?.chatId as string;
  const [chat, setChat] = useState<{
    id: string;
    title: string | null;
    createdAt: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const loadChat = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}`);
        if (!response.ok) {
          throw new Error('Chat not found');
        }
        const data = await response.json();
        setChat(data);
      } catch (error) {
        console.error('Error loading chat:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-gray-600">Yükleniyor...</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-red-600">Sohbet bulunamadı</p>
      </div>
    );
  }

  const title = chat.title || 'Başlıksız Sohbet';
  const date = new Date(chat.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date(chat.createdAt).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white p-4 print:p-0 print:min-h-0 print:h-auto" style={{ backgroundColor: 'white', minHeight: 'auto', height: 'auto' }}>
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          * {
            box-sizing: border-box;
          }
          html {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            background-color: white !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            overflow: visible !important;
          }
          /* Ensure root div has white background */
          body > div {
            background-color: white !important;
            min-height: auto !important;
            height: auto !important;
          }
          /* Remove unnecessary spacing */
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          /* Ensure code blocks are fully visible */
          pre {
            font-size: 9px !important;
            line-height: 1.4 !important;
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            white-space: pre-wrap !important;
            page-break-inside: avoid !important;
            background-color: #1f2937 !important;
            color: #f3f4f6 !important;
            padding: 12px !important;
            border-radius: 6px !important;
            margin: 8px 0 !important;
          }
          /* Hide empty code blocks */
          pre:empty,
          pre:has(code:empty),
          pre code:empty {
            display: none !important;
          }
          code {
            font-size: 9px !important;
            background-color: transparent !important;
          }
          /* Inline code styling */
          p code, li code, td code, th code {
            background-color: #e5e7eb !important;
            color: #111827 !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
          }
          /* Code inside pre blocks */
          pre code {
            background-color: transparent !important;
            color: #f3f4f6 !important;
          }
          /* Ensure tables are fully visible */
          table {
            font-size: 10px !important;
            page-break-inside: avoid !important;
          }
          /* Ensure text is readable */
          p, li, td, th {
            font-size: 11px !important;
            line-height: 1.5 !important;
            color: #000000 !important;
          }
          /* Ensure headings are readable with proper spacing */
          h1 {
            font-size: 20px !important;
            color: #000000 !important;
            margin-top: 1.5em !important;
            margin-bottom: 0.5em !important;
          }
          h1:first-child {
            margin-top: 0 !important;
          }
          h2 {
            font-size: 18px !important;
            color: #000000 !important;
            margin-top: 1.2em !important;
            margin-bottom: 0.5em !important;
          }
          h2:first-child {
            margin-top: 0 !important;
          }
          h3 {
            font-size: 16px !important;
            color: #000000 !important;
            margin-top: 1em !important;
            margin-bottom: 0.4em !important;
          }
          h3:first-child {
            margin-top: 0 !important;
          }
          h4 {
            font-size: 14px !important;
            color: #000000 !important;
            margin-top: 0.8em !important;
            margin-bottom: 0.4em !important;
          }
          h4:first-child {
            margin-top: 0 !important;
          }
          /* Remove unnecessary margins on last page */
          .messages-container {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .messages-container > *:last-child {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .messages-container > *:last-child > * {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          /* Hide header in PDF */
          .print-header {
            display: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Remove min-height from main container */
          .print-main {
            min-height: 0 !important;
            height: auto !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
            overflow: visible !important;
            background-color: white !important;
          }
          /* Ensure no extra space at the end */
          .print-main > *:last-child {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          /* Remove any default margins from prose */
          .prose {
            margin-bottom: 0 !important;
            background-color: white !important;
          }
          .prose > *:last-child {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          /* Ensure messages container has white background */
          .messages-container {
            background-color: white !important;
          }
          /* Ensure all containers have white background, not black */
          div {
            background-color: white !important;
          }
          /* Restore white backgrounds for specific containers */
          body, html, .print-main, .messages-container, .prose, body > div {
            background-color: white !important;
          }
          /* Ensure no black backgrounds anywhere */
          * {
            background-color: inherit !important;
          }
          /* Force white for root elements */
          html, body, body > div, .print-main {
            background-color: white !important;
          }
        }
      `}</style>
      
      {/* Main content container */}
      <div className="print-main">
        {/* Header - Compact */}
        <div className="print-header mb-3 border-b border-gray-300 pb-2 print:mb-2 print:pb-1">
          <h1 className="text-lg font-bold text-gray-900 mb-0.5 print:text-base print:mb-0">{title}</h1>
          <div className="text-xs text-gray-900 print:text-[10px]">
            <span>Tarih: {date} - {time}</span>
            <span className="mx-2">•</span>
            <span>Mesaj: {chat.messages.filter((m) => m.role === 'assistant').length}</span>
          </div>
        </div>

        {/* Messages - Only show assistant messages, no user messages */}
        <div className="messages-container space-y-3 print:space-y-2">
          {chat.messages
            .filter((msg) => msg.role === 'assistant')
            .map((msg, index, array) => {
              const isLast = index === array.length - 1;
              return (
                <div key={msg.id} className={`break-inside-avoid print:break-inside-auto ${isLast ? 'print:mb-0 mb-0' : 'mb-3 print:mb-2'}`}>
                  {/* Message Content - No role header, just the content */}
                  <div className="prose prose-sm max-w-none text-gray-900 print:prose-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children, ...props }: any) => {
                      // Check if code block is empty or only contains whitespace
                      const codeContent = React.Children.toArray(children)
                        .map((child: any) => {
                          if (typeof child === 'string') return child;
                          if (child?.props?.children) {
                            return React.Children.toArray(child.props.children).join('');
                          }
                          return '';
                        })
                        .join('')
                        .trim();
                      
                      // Don't render empty code blocks
                      if (!codeContent) {
                        return null;
                      }
                      
                      return (
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-[9px] leading-tight whitespace-pre-wrap break-words" style={{ maxWidth: '100%', wordWrap: 'break-word', backgroundColor: '#1f2937', color: '#f3f4f6' }} {...props}>
                          {children}
                        </pre>
                      );
                    },
                    code: ({ children, className, ...props }: any) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-[9px] text-gray-900" style={{ backgroundColor: '#e5e7eb', color: '#111827' }} {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className={`${className} text-[9px] text-gray-100`} style={{ backgroundColor: 'transparent', color: '#f3f4f6' }} {...props}>
                          {children}
                        </code>
                      );
                    },
                    h1: ({ children, ...props }: any) => (
                      <h1 className="text-[20px] font-bold text-gray-900" style={{ marginTop: '1.5em', marginBottom: '0.5em' }} {...props}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children, ...props }: any) => (
                      <h2 className="text-[18px] font-bold text-gray-900" style={{ marginTop: '1.2em', marginBottom: '0.5em' }} {...props}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }: any) => (
                      <h3 className="text-[16px] font-semibold text-gray-900" style={{ marginTop: '1em', marginBottom: '0.4em' }} {...props}>
                        {children}
                      </h3>
                    ),
                    p: ({ children, ...props }: any) => (
                      <p className="my-2 leading-relaxed text-[11px] text-gray-900" {...props}>
                        {children}
                      </p>
                    ),
                    ul: ({ children, ...props }: any) => (
                      <ul className="list-disc pl-6 my-2" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }: any) => (
                      <ol className="list-decimal pl-6 my-2" {...props}>
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }: any) => (
                      <li className="my-1 text-[11px] text-gray-900" {...props}>
                        {children}
                      </li>
                    ),
                    blockquote: ({ children, ...props }: any) => (
                      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props}>
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children, ...props }: any) => (
                      <strong className="font-bold" {...props}>
                        {children}
                      </strong>
                    ),
                    em: ({ children, ...props }: any) => (
                      <em className="italic" {...props}>
                        {children}
                      </em>
                    ),
                    a: ({ children, href, ...props }: any) => (
                      <a href={href} className="text-blue-600 underline" {...props}>
                        {children}
                      </a>
                    ),
                    img: ({ src, alt, ...props }: any) => {
                      // Handle base64 images
                      if (src?.startsWith('data:image')) {
                        return (
                          <img 
                            src={src} 
                            alt={alt || ''} 
                            className="max-w-full h-auto my-4 rounded-lg" 
                            {...props} 
                          />
                        );
                      }
                      return (
                        <img 
                          src={src || ''} 
                          alt={alt || ''} 
                          className="max-w-full h-auto my-4 rounded-lg" 
                          {...props} 
                        />
                      );
                    },
                    table: ({ children, ...props }: any) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300 text-[10px]" style={{ pageBreakInside: 'avoid' }} {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children, ...props }: any) => (
                      <thead className="bg-gray-100" {...props}>
                        {children}
                      </thead>
                    ),
                    tbody: ({ children, ...props }: any) => (
                      <tbody {...props}>
                        {children}
                      </tbody>
                    ),
                    tr: ({ children, ...props }: any) => (
                      <tr className="border-b border-gray-300 hover:bg-gray-50 transition-colors" {...props}>
                        {children}
                      </tr>
                    ),
                    th: ({ children, ...props }: any) => (
                      <th className="px-3 py-2 text-left font-semibold border-r border-gray-300 last:border-r-0 text-[10px] text-gray-900" {...props}>
                        {children}
                      </th>
                    ),
                    td: ({ children, ...props }: any) => (
                      <td className="px-3 py-2 border-r border-gray-300 last:border-r-0 text-[10px] text-gray-900" {...props}>
                        {children}
                      </td>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

