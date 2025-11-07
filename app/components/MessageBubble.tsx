'use client';

import { Message } from '@/app/types';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@/app/contexts/ThemeContext';

interface MessageBubbleProps {
  message: Message;
  index: number;
  onEdit?: (content: string) => void;
}

// Code block component with copy button
function CodeBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const currentTheme = theme || 'dark';
  
  // ReactMarkdown passes code element as child of pre
  // Extract code element and its properties
  const codeElement = React.Children.toArray(children).find(
    (child: any) => child?.type === 'code' || (typeof child === 'object' && child?.props?.className?.includes('language-'))
  ) as any;
  
  // Extract language from code element's className
  const codeClassName = codeElement?.props?.className || '';
  const match = /language-(\w+)/.exec(codeClassName);
  const language = match ? match[1] : '';
  
  // Extract code content
  const code = codeElement?.props?.children 
    ? String(codeElement.props.children).replace(/\n$/, '')
    : String(children).replace(/\n$/, '');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative group my-2 sm:my-4 max-w-full overflow-hidden">
      {/* Code block container */}
      <div className={`relative rounded-lg overflow-hidden border ${
        currentTheme === 'dark' 
          ? 'bg-[#1e1e1e] border-[#3e3e3e]' 
          : 'bg-[#f6f6f6] border-[#e5e5e5]'
      }`}>
        {/* Language label and copy button */}
        <div className={`flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 border-b ${
          currentTheme === 'dark' 
            ? 'bg-[#252526] border-[#3e3e3e]' 
            : 'bg-[#f0f0f0] border-[#e5e5e5]'
        }`}>
          {language && (
            <span className={`text-xs font-medium uppercase ${
              currentTheme === 'dark' 
                ? 'text-[#858585]' 
                : 'text-[#6e6e6e]'
            }`}>
              {language}
            </span>
          )}
          {!language && <div />}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all cursor-pointer ${
              currentTheme === 'dark'
                ? 'text-[#858585] hover:text-[#ececf1] hover:bg-[#2d2d2d]'
                : 'text-[#6e6e6e] hover:text-[#353740] hover:bg-[#e5e5e5]'
            }`}
            title={copied ? 'Kopyalandı' : 'Kopyala'}
          >
            {copied ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="ml-0.5">Kopyalandı</span>
              </>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
        </div>
        {/* Code content - render pre element with children (code element) */}
        <pre className={`m-0 p-2 sm:p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed ${
          currentTheme === 'dark' 
            ? 'text-[#d4d4d4]' 
            : 'text-[#1e1e1e]'
        }`} {...props}>
          {children}
        </pre>
      </div>
    </div>
  );
}

export default function MessageBubble({ message, index, onEdit }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { theme } = useTheme();
  const currentTheme = theme || 'dark'; // Fallback to dark if theme not available

  const isUser = message.role === 'user';

  // Clean message content - hide long base64 strings from text display
  // Extract image and 3D model data URLs and replace with short references for text display
  const getDisplayContent = () => {
    let content = message.content;
    
    // Find all image markdown patterns: ![alt](data:image/...;base64,...)
    const imagePattern = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const matches = [...content.matchAll(imagePattern)];
    
    // Replace long base64 strings with short references in text
    matches.forEach((match) => {
      const [fullMatch, alt, dataUrl] = match;
      // Replace with just the image reference, base64 will be used for img src
      content = content.replace(fullMatch, `![${alt}](image-data-hidden)`);
    });
    
    
    return content;
  };

  // Extract image data URLs from message content for rendering
  const extractImageDataUrls = () => {
    const imagePattern = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    const matches = [...message.content.matchAll(imagePattern)];
    return matches.map(match => ({
      alt: match[1],
      src: match[2],
    }));
  };

  // Handle image click to open modal
  const handleImageClick = (src: string) => {
    setSelectedImage(src);
    setImageModalOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="group w-full py-2 px-2 sm:py-2 sm:px-0 bg-[var(--bg-primary)] transition-colors">
      <div className={`mx-auto flex max-w-3xl px-2 sm:px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Content */}
        <div className={`w-full ${isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
          <div className={`w-full ${isUser ? `bg-[var(--user-message-bg)] rounded-lg inline-block px-3 py-2 sm:px-4 sm:py-2.5 max-w-[85%] sm:max-w-[70%]` : 'max-w-full overflow-x-hidden'} prose prose-sm ${isUser ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-full'} prose-p:my-0 prose-p:leading-[1.75] prose-p:text-[14px] sm:prose-p:text-[15px] ${isUser ? '' : 'prose-p:break-words'} prose-ul:my-0 prose-ol:my-0 prose-li:my-0 prose-li:leading-[1.7] prose-headings:my-0 prose-headings:font-bold prose-headings:leading-tight prose-headings:break-words prose-h1:text-[22px] sm:prose-h1:text-[28px] prose-h1:font-extrabold prose-h2:text-[18px] sm:prose-h2:text-[22px] prose-h2:font-bold prose-h3:text-[16px] sm:prose-h3:text-[18px] prose-h3:font-semibold prose-h4:text-[14px] sm:prose-h4:text-[16px] prose-h4:font-semibold prose-blockquote:my-0 prose-blockquote:pl-3 sm:prose-blockquote:pl-5 prose-blockquote:border-l-[3px] prose-blockquote:italic prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 sm:prose-ul:pl-7 prose-ol:pl-5 sm:prose-ol:pl-7 prose-li:pl-1 sm:prose-li:pl-2 prose-p:first:my-0 prose-p:last:my-0 prose-strong:font-semibold prose-strong:text-inherit ${isUser ? '' : 'prose-strong:break-words'} prose-u:no-underline prose-a:text-[var(--accent-color)] prose-a:no-underline hover:prose-a:underline prose-a:break-all prose-code:break-words prose-pre:overflow-x-auto prose-pre:max-w-full ${
            currentTheme === 'dark' 
              ? 'prose-invert prose-code:text-[#ececf1] prose-p:text-[#ececf1] prose-strong:text-[#ececf1] prose-headings:text-[#ececf1] prose-li:text-[#ececf1] prose-blockquote:text-[#d1d5db] prose-blockquote:border-[#4b5563]' 
              : 'prose-code:text-[#353740] prose-p:text-[#353740] prose-strong:text-[#353740] prose-headings:text-[#353740] prose-li:text-[#353740] prose-blockquote:text-[#4b5563] prose-blockquote:border-[#d1d5db]'
          }`}>
            {message.isStreaming ? (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: CodeBlock,
                      h1: ({ node, children, ...props }: any) => (
                        <h1 className="text-[28px] font-extrabold my-0 leading-tight" {...props}>
                          {children}
                        </h1>
                      ),
                      h2: ({ node, children, ...props }: any) => (
                        <h2 className="text-[22px] font-bold my-0 leading-tight" {...props}>
                          {children}
                        </h2>
                      ),
                      h3: ({ node, children, ...props }: any) => (
                        <h3 className="text-[18px] font-semibold my-0 leading-tight" {...props}>
                          {children}
                        </h3>
                      ),
                      h4: ({ node, children, ...props }: any) => (
                        <h4 className="text-[16px] font-semibold my-0 leading-tight" {...props}>
                          {children}
                        </h4>
                      ),
                      p: ({ node, children, ...props }: any) => (
                        <p className="my-0 leading-[1.75] text-[15px]" {...props}>
                          {children}
                        </p>
                      ),
                      ul: ({ node, children, ...props }: any) => (
                        <ul className="my-0 pl-7 list-disc space-y-0" {...props}>
                          {children}
                        </ul>
                      ),
                      ol: ({ node, children, ...props }: any) => (
                        <ol className="my-0 pl-7 list-decimal space-y-0" {...props}>
                          {children}
                        </ol>
                      ),
                      li: ({ node, children, ...props }: any) => (
                        <li className="my-0 leading-[1.7] pl-2" {...props}>
                          {children}
                        </li>
                      ),
                      blockquote: ({ node, children, ...props }: any) => (
                        <blockquote 
                          className={`my-0 pl-5 border-l-[3px] italic ${
                            currentTheme === 'dark'
                              ? 'border-[#4b5563] text-[#d1d5db]'
                              : 'border-[#d1d5db] text-[#4b5563]'
                          }`}
                          {...props}
                        >
                          {children}
                        </blockquote>
                      ),
                      code: ({ node, inline, className, children, ...props }: any) => {
                        // Inline code (not code blocks)
                        if (inline) {
                          return (
                            <code 
                              className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                                currentTheme === 'dark'
                                  ? 'bg-[#2d2d2d] text-[#ececf1]'
                                  : 'bg-[#f0f0f0] text-[#353740]'
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }
                        // Code blocks are handled by pre component
                        return <code className={className} {...props}>{children}</code>;
                      },
                      strong: ({ node, children, ...props }: any) => (
                        <strong className="font-semibold" {...props}>
                          {children}
                        </strong>
                      ),
                      u: ({ node, children, ...props }: any) => (
                        <span className="no-underline" {...props}>
                          {children}
                        </span>
                      ),
                      hr: ({ node, ...props }: any) => (
                        <div className="hidden" {...props} />
                      ),
                      a: ({ node, children, ...props }: any) => (
                        <a 
                          className="text-[var(--accent-color)] no-underline hover:underline transition-colors" 
                          {...props}
                        >
                          {children}
                        </a>
                      ),
                      img: ({ node, src, alt, ...props }: any) => {
                        // If src is a placeholder, try to find the actual data URL from message content
                        let imageSrc = src;
                        if (src === 'image-data-hidden' || src === 'image-data' || src === 'image-uploaded') {
                          // Find the actual image data URL from message content
                          const imagePattern = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
                          const matches = [...message.content.matchAll(imagePattern)];
                          const match = matches.find(m => m[1] === alt || m[1] === (alt || ''));
                          if (match) {
                            imageSrc = match[2];
                          }
                        }
                        
                        return (
                          <img
                            src={imageSrc}
                            alt={alt || 'Image'}
                            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity my-2"
                            onClick={() => handleImageClick(imageSrc || '')}
                            {...props}
                          />
                        );
                      },
                      table: ({ node, children, ...props }: any) => (
                        <div className="overflow-x-auto my-4">
                          <table 
                            className={`min-w-full border-collapse ${
                              currentTheme === 'dark'
                                ? 'border-[#3e3e3e]'
                                : 'border-[#e5e5e5]'
                            }`}
                            {...props}
                          >
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ node, children, ...props }: any) => (
                        <thead 
                          className={
                            currentTheme === 'dark'
                              ? 'bg-[#2d2d2d]'
                              : 'bg-[#f0f0f0]'
                          }
                          {...props}
                        >
                          {children}
                        </thead>
                      ),
                      tbody: ({ node, children, ...props }: any) => (
                        <tbody {...props}>
                          {children}
                        </tbody>
                      ),
                      tr: ({ node, children, ...props }: any) => (
                        <tr 
                          className={`border-b ${
                            currentTheme === 'dark'
                              ? 'border-[#3e3e3e] hover:bg-[#2d2d2d]'
                              : 'border-[#e5e5e5] hover:bg-[#f9f9f9]'
                          } transition-colors`}
                          {...props}
                        >
                          {children}
                        </tr>
                      ),
                      th: ({ node, children, ...props }: any) => (
                        <th 
                          className={`px-4 py-2 text-left font-semibold ${
                            currentTheme === 'dark'
                              ? 'text-[#ececf1] border-[#3e3e3e]'
                              : 'text-[#353740] border-[#e5e5e5]'
                          } border-r last:border-r-0`}
                          {...props}
                        >
                          {children}
                        </th>
                      ),
                      td: ({ node, children, ...props }: any) => (
                        <td 
                          className={`px-4 py-2 ${
                            currentTheme === 'dark'
                              ? 'text-[#ececf1] border-[#3e3e3e]'
                              : 'text-[#353740] border-[#e5e5e5]'
                          } border-r last:border-r-0`}
                          {...props}
                        >
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {getDisplayContent()}
                  </ReactMarkdown>
                </div>
                <span className={`inline-block h-4 w-0.5 animate-pulse mt-1 ${
                  currentTheme === 'dark' ? 'bg-white' : 'bg-[var(--text-primary)]'
                }`}>|</span>
              </div>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: CodeBlock,
                  h1: ({ node, children, ...props }: any) => (
                    <h1 className="text-[28px] font-extrabold my-0 leading-tight" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ node, children, ...props }: any) => (
                    <h2 className="text-[22px] font-bold my-0 leading-tight" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ node, children, ...props }: any) => (
                    <h3 className="text-[18px] font-semibold my-0 leading-tight" {...props}>
                      {children}
                    </h3>
                  ),
                  h4: ({ node, children, ...props }: any) => (
                    <h4 className="text-[16px] font-semibold my-0 leading-tight" {...props}>
                      {children}
                    </h4>
                  ),
                  p: ({ node, children, ...props }: any) => (
                    <p className="my-0 leading-[1.75] text-[15px]" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({ node, children, ...props }: any) => (
                    <ul className="my-0 pl-7 list-disc space-y-0" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ node, children, ...props }: any) => (
                    <ol className="my-0 pl-7 list-decimal space-y-0" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ node, children, ...props }: any) => (
                    <li className="my-0 leading-[1.7] pl-2" {...props}>
                      {children}
                    </li>
                  ),
                  blockquote: ({ node, children, ...props }: any) => (
                    <blockquote 
                      className={`my-0 pl-5 border-l-[3px] italic ${
                        currentTheme === 'dark'
                          ? 'border-[#4b5563] text-[#d1d5db]'
                          : 'border-[#d1d5db] text-[#4b5563]'
                      }`}
                      {...props}
                    >
                      {children}
                    </blockquote>
                  ),
                  code: ({ node, inline, className, children, ...props }: any) => {
                    // Inline code (not code blocks)
                    if (inline) {
                      return (
                        <code 
                          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                            currentTheme === 'dark'
                              ? 'bg-[#2d2d2d] text-[#ececf1]'
                              : 'bg-[#f0f0f0] text-[#353740]'
                          }`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    // Code blocks are handled by pre component
                    return <code className={className} {...props}>{children}</code>;
                  },
                  strong: ({ node, children, ...props }: any) => (
                    <strong className="font-semibold" {...props}>
                      {children}
                    </strong>
                  ),
                  u: ({ node, children, ...props }: any) => (
                    <span className="no-underline" {...props}>
                      {children}
                    </span>
                  ),
                  hr: ({ node, ...props }: any) => (
                    <div className="hidden" {...props} />
                  ),
                  a: ({ node, children, ...props }: any) => (
                    <a 
                      className="text-[var(--accent-color)] no-underline hover:underline transition-colors" 
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  img: ({ node, src, alt, ...props }: any) => {
                    // If src is a placeholder, try to find the actual data URL from message content
                    let imageSrc = src;
                    if (src === 'image-data-hidden' || src === 'image-data' || src === 'image-uploaded') {
                      // Find the actual image data URL from message content
                      const imagePattern = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
                      const matches = [...message.content.matchAll(imagePattern)];
                      const match = matches.find(m => m[1] === alt || m[1] === (alt || ''));
                      if (match) {
                        imageSrc = match[2];
                      }
                    }
                    
                    return (
                      <img
                        src={imageSrc}
                        alt={alt || 'Image'}
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity my-2"
                        onClick={() => handleImageClick(imageSrc || '')}
                        {...props}
                      />
                    );
                  },
                  table: ({ node, children, ...props }: any) => (
                    <div className="overflow-x-auto my-4">
                      <table 
                        className={`min-w-full border-collapse ${
                          currentTheme === 'dark'
                            ? 'border-[#3e3e3e]'
                            : 'border-[#e5e5e5]'
                        }`}
                        {...props}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ node, children, ...props }: any) => (
                    <thead 
                      className={
                        currentTheme === 'dark'
                          ? 'bg-[#2d2d2d]'
                          : 'bg-[#f0f0f0]'
                      }
                      {...props}
                    >
                      {children}
                    </thead>
                  ),
                  tbody: ({ node, children, ...props }: any) => (
                    <tbody {...props}>
                      {children}
                    </tbody>
                  ),
                  tr: ({ node, children, ...props }: any) => (
                    <tr 
                      className={`border-b ${
                        currentTheme === 'dark'
                          ? 'border-[#3e3e3e] hover:bg-[#2d2d2d]'
                          : 'border-[#e5e5e5] hover:bg-[#f9f9f9]'
                      } transition-colors`}
                      {...props}
                    >
                      {children}
                    </tr>
                  ),
                  th: ({ node, children, ...props }: any) => (
                    <th 
                      className={`px-4 py-2 text-left font-semibold ${
                        currentTheme === 'dark'
                          ? 'text-[#ececf1] border-[#3e3e3e]'
                          : 'text-[#353740] border-[#e5e5e5]'
                      } border-r last:border-r-0`}
                      {...props}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ node, children, ...props }: any) => (
                    <td 
                      className={`px-4 py-2 ${
                        currentTheme === 'dark'
                          ? 'text-[#ececf1] border-[#3e3e3e]'
                          : 'text-[#353740] border-[#e5e5e5]'
                      } border-r last:border-r-0`}
                      {...props}
                    >
                      {children}
                    </td>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Actions */}
          {!message.isStreaming && (
            <div className={`mt-0.5 flex items-center gap-2 ${isUser ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
              {/* Timestamp */}
              {message.timestamp && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {new Date(message.timestamp).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {/* Copy button - for both user and AI messages */}
              <button
                onClick={handleCopy}
                className="flex items-center justify-center rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                title={copied ? 'Kopyalandı' : 'Kopyala'}
              >
                {copied ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
              {/* Edit button - only for user messages */}
              {isUser && onEdit && (
                <button
                  onClick={() => onEdit(message.content)}
                  className="flex items-center justify-center rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                  title="Düzenle"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setImageModalOpen(false);
            setSelectedImage(null);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => {
                setImageModalOpen(false);
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
              title="Kapat"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

