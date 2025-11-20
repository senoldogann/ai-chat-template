'use client';

import { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSend: (message: string, fileData?: any, useWebSearch?: boolean) => void;
  isLoading: boolean;
  initialValue?: string;
  onValueChange?: (value: string) => void;
  currentChatId?: string | null;
  isEditing?: boolean;
}

export default function InputArea({ onSend, isLoading, initialValue, onValueChange, currentChatId, isEditing = false }: InputAreaProps) {
  const [input, setInput] = useState(initialValue || '');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Update input when initialValue changes (only if different)
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== input) {
      setInput(initialValue);
    }
  }, [initialValue]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea with max height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 200; // Max height in pixels
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      // Enable scrolling if content exceeds max height
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || uploadedFile) && !isLoading && !isUploading) {
      onSend(input, uploadedFile, useWebSearch);
      setInput('');
      // Clean up preview URL if exists
      if (uploadedFile?.preview) {
        URL.revokeObjectURL(uploadedFile.preview);
      }
      setUploadedFile(null);
      setUseWebSearch(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle prompt improvement
  const handleImprovePrompt = async () => {
    if (!input.trim() || isImproving || isLoading || isUploading) return;

    setIsImproving(true);
    try {
      const response = await fetch('/api/prompt/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      // Clone response for error handling (response body can only be read once)
      const responseClone = response.clone();

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to improve prompt';
        try {
          const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
          const errorData = await safeJsonParse<any>(responseClone);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
      const data = await safeJsonParse<any>(response);
      
      if (data.improved) {
        setInput(data.improved);
        if (onValueChange) {
          onValueChange(data.improved);
        }
      } else {
        console.warn('No improved prompt received from API');
      }
    } catch (error) {
      console.error('Error improving prompt:', error);
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Prompt iyileştirilemedi. Lütfen tekrar deneyin.';
      alert(errorMessage);
    } finally {
      setIsImproving(false);
    }
  };

  // Handle file upload
  const handleFileClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };
  
  // Handle web search toggle
  const handleWebSearchToggle = () => {
    setUseWebSearch(!useWebSearch);
    setShowDropdown(false);
  };
  
  // Handle prompt improve
  const handlePromptImproveClick = () => {
    handleImprovePrompt();
    setShowDropdown(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Upload file to API
      const formData = new FormData();
      formData.append('file', file);
      if (currentChatId) {
        formData.append('chatId', currentChatId);
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dosya yüklenemedi');
      }

      const data = await response.json();
      
      // Store file data with preview for images
      const fileData = {
        ...data.file,
        preview: file.type.startsWith('image/') ? (data.file.metadata?.dataUrl || URL.createObjectURL(file)) : null,
      };
      setUploadedFile(fileData);
      
      // Don't update input with file name - just show preview
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error instanceof Error ? error.message : 'Dosya yüklenemedi');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-[var(--input-bg)] overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 py-4 overflow-hidden">
        <form onSubmit={handleSubmit} className="relative overflow-hidden">
          {/* File Preview - Only for images, shown above input */}
          {uploadedFile && uploadedFile.preview && uploadedFile.type?.startsWith('image/') && (
            <div className="flex items-center gap-2 px-2 mb-2">
              <img
                src={uploadedFile.preview}
                alt={uploadedFile.name || 'Preview'}
                className="w-16 h-16 object-cover rounded-lg border border-[var(--border-color)]"
              />
              <button
                onClick={() => {
                  setUploadedFile(null);
                  if (uploadedFile.preview && uploadedFile.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(uploadedFile.preview);
                  }
                }}
                className="p-1 rounded hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                title="Dosyayı kaldır"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-[var(--text-secondary)]"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}
          <div className="relative flex items-start gap-2 rounded-2xl bg-[var(--border-color)] shadow-lg focus-within:shadow-xl transition-all min-h-[52px] py-2 overflow-hidden">
            {/* Left side - Plus button with dropdown */}
            <div className="flex items-center ml-2 mt-2 shrink-0 relative z-10" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                title="Menüyü aç"
                disabled={isLoading || isUploading}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[var(--text-primary)]"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              
              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute bottom-full left-0 mb-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-xl py-2 min-w-[180px] z-50">
                  {/* File upload option */}
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--hover-bg)] transition-colors text-left cursor-pointer ${
                      isLoading || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading || isUploading}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--text-primary)]"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span className="text-[var(--text-primary)] text-sm">Dosya ekle</span>
                  </button>
                  
                  {/* Web search option */}
                  <button
                    type="button"
                    onClick={handleWebSearchToggle}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--hover-bg)] transition-colors text-left ${
                      isLoading || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    disabled={isLoading || isUploading}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={useWebSearch ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <span className={`text-sm ${useWebSearch ? 'text-[var(--accent-color)] font-medium' : 'text-[var(--text-primary)]'}`}>
                      {useWebSearch ? 'Web araması aktif' : 'Web araması'}
                    </span>
                  </button>
                  
                  {/* Prompt improvement option */}
                  <button
                    type="button"
                    onClick={handlePromptImproveClick}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--hover-bg)] transition-colors text-left ${
                      isLoading || isUploading || isImproving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    disabled={isLoading || isUploading || isImproving || !input.trim()}
                  >
                      {isImproving ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="animate-spin text-[var(--text-primary)]"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-[var(--text-primary)]"
                        >
                          {/* Sparkle/Star icon */}
                          <path
                            d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="0.5"
                          />
                        </svg>
                      )}
                      <span className="text-[var(--text-primary)] text-sm">
                        {isImproving ? 'İyileştiriliyor...' : "Prompt'u iyileştir"}
                      </span>
                    </button>
                </div>
              )}
            </div>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
              accept="image/*,application/pdf,.doc,.docx,.txt"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (onValueChange) {
                  onValueChange(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Herhangi bir şey sor"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none py-3 pr-3 min-h-[36px] max-h-[200px] overflow-y-auto leading-[1.5] scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
              disabled={isLoading || isUploading}
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            />

            {/* Right side - Send button (white circle with black arrow up) */}
            <div className="flex items-center gap-2 mr-2 mt-2 shrink-0 relative z-10">
              <button
                type="submit"
                disabled={(!input.trim() && !uploadedFile) || isLoading || isUploading}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 ${
                  (!input.trim() && !uploadedFile) || isLoading || isUploading
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-white cursor-pointer hover:bg-gray-100 dark:bg-white'
                }`}
                title="Gönder"
              >
                {isLoading ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="animate-spin text-black dark:text-gray-800"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-black dark:text-gray-800"
                  >
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
        <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
          AI yanıtları hata içerebilir. Önemli bilgileri doğrulayın.
        </p>
      </div>
    </div>
  );
}

