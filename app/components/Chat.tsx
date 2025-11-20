'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/app/types';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal';
import ThinkingIndicator from './ThinkingIndicator';
import ProviderSelector from './ProviderSelector';
import { validateMessage, sanitizeInput } from '@/lib/prompt-sanitizer';
import { useTheme } from '@/app/contexts/ThemeContext';

// Sanitize message for API (additional layer)
function sanitizeMessageForAPI(content: string): string {
  return sanitizeInput(content);
}


interface ChatProps {
  initialChatId?: string;
}

export default function Chat({ initialChatId }: ChatProps = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  
  // Load selected provider and model from localStorage on mount
  const [selectedProvider, setSelectedProvider] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('ai-chat-selected-provider') || null;
      } catch (error) {
        console.error('Error loading selected provider from localStorage:', error);
      }
    }
    return null;
  });
  
  const [selectedModel, setSelectedModel] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('ai-chat-selected-model') || null;
      } catch (error) {
        console.error('Error loading selected model from localStorage:', error);
      }
    }
    return null;
  });
  
  const [availableProviders, setAvailableProviders] = useState<Record<string, { name: string; models: string[] }>>({});
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingChatRef = useRef<string | null>(null); // Track which chat is currently loading
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
  
  // Save selected provider to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (selectedProvider) {
          localStorage.setItem('ai-chat-selected-provider', selectedProvider);
        } else {
          localStorage.removeItem('ai-chat-selected-provider');
        }
      } catch (error) {
        console.error('Error saving selected provider to localStorage:', error);
      }
    }
  }, [selectedProvider]);
  
  // Save selected model to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (selectedModel) {
          localStorage.setItem('ai-chat-selected-model', selectedModel);
        } else {
          localStorage.removeItem('ai-chat-selected-model');
        }
      } catch (error) {
        console.error('Error saving selected model to localStorage:', error);
      }
    }
  }, [selectedModel]);

  // Load initial chat if provided (only when component mounts or initialChatId changes)
  useEffect(() => {
    if (initialChatId) {
      // Only load if initialChatId is different from currentChatId and not already loading
      // This prevents double loading when Sidebar calls loadChat first
      // Also check if messages are already loaded for this chat
      const hasMessages = messages.length > 0 && messages.some(msg => msg.content && msg.content.trim() !== '');
      const isSameChat = currentChatId === initialChatId;
      const isCurrentlyLoading = loadingChatRef.current === initialChatId;
      
      // Only load if:
      // 1. Different chat ID, OR
      // 2. Same chat but no messages loaded, OR
      // 3. Not currently loading
      if ((!isSameChat || !hasMessages) && !isCurrentlyLoading) {
        // Don't call router.replace here - it's already called in loadChat
        // Just call loadChat directly
        loadChat(initialChatId);
      }
    } else if (currentChatId) {
      // If no initialChatId but we have a currentChatId, clear it
      // This handles the case when navigating to home page
      setCurrentChatId(null);
      setMessages([]);
      document.title = 'AI Chat Assistant';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for chat updates to refresh browser title
  useEffect(() => {
    const handleChatUpdate = async () => {
      // If we have a current chat, reload it to get updated title
      if (currentChatId) {
        try {
          const response = await fetch(`/api/chats/${currentChatId}`);
          if (response.ok) {
            const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
            const chat = await safeJsonParse<any>(response);
            if (chat && chat.title) {
              document.title = `${chat.title} - AI Sohbet Asistanı`;
            } else {
              document.title = 'AI Sohbet Asistanı';
            }
          }
        } catch (error) {
          console.error('Error refreshing chat title:', error);
        }
      }
    };

    window.addEventListener('chatUpdated', handleChatUpdate);
    return () => {
      window.removeEventListener('chatUpdated', handleChatUpdate);
    };
  }, [currentChatId]);

  // Create new chat
  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.status} ${response.statusText}`);
      }
      
      const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
      const chat = await safeJsonParse<any>(response);
      setCurrentChatId(chat.id);
      setMessages([]);
      // Update URL to /c/[chatId] - use replace to avoid adding to history
      router.replace(`/c/${chat.id}`);
      return chat.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  };

  // Load chat from database
  const loadChat = async (chatId: string) => {
    // Validate chatId before making request
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      console.error('Invalid chatId provided to loadChat:', chatId);
      setCurrentChatId(null);
      setMessages([]);
      loadingChatRef.current = null;
      return;
    }

    // Prevent loading if already loading the same chat
    if (loadingChatRef.current === chatId) {
      console.log('Chat already loading, skipping:', chatId);
      return;
    }

    // Always load the chat if it's different from current
    // This ensures the chat loads on first click
    // Only skip if it's the exact same chat with messages already loaded AND not currently loading
    const hasMessages = messages.length > 0 && messages.some(msg => msg.content && msg.content.trim() !== '');
    const isCurrentlyLoading = loadingChatRef.current === chatId;
    const isSameChat = currentChatId === chatId;
    
    // Only skip if same chat, has messages, and not currently loading
    if (isSameChat && hasMessages && !isCurrentlyLoading) {
      console.log('Chat already loaded with messages, skipping:', chatId);
      return;
    }
    
    // If chatId is different from current, always load
    // This ensures chat loads on first click from Sidebar
    // No need to check anything else - just load it

    try {
      // Mark as loading FIRST to prevent duplicate calls
      loadingChatRef.current = chatId;
      
      // Clear messages and set chatId immediately to show loading state
      // This ensures UI updates immediately
      setMessages([]);
      setCurrentChatId(chatId);
      
      // Close sidebar on mobile when loading chat
      setSidebarOpen(false);
      
      // Navigate to chat route (use replace to avoid back button issues)
      // Only navigate if we're not already on this route
      if (typeof window !== 'undefined' && !window.location.pathname.includes(`/c/${chatId}`)) {
        router.replace(`/c/${chatId}`);
      }
      
      // Fetch chat data
      const response = await fetch(`/api/chats/${chatId}`);
      
      // Use safeJsonParse to handle HTML error pages
      const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
      
      if (!response.ok) {
        // If chat not found (404), just clear state
        if (response.status === 404) {
          setCurrentChatId(null);
          setMessages([]);
          router.replace('/');
          return;
        }
        
        // Try to get error message from response
        try {
          const errorData = await safeJsonParse<any>(response);
          const errorMessage = errorData.error || `Failed to load chat: ${response.status} ${response.statusText}`;
          throw new Error(errorMessage);
        } catch (parseError) {
          // If parsing fails, use status text
          throw new Error(`Failed to load chat: ${response.status} ${response.statusText}`);
        }
      }
      
      const chat = await safeJsonParse<any>(response);
      
      if (!chat || !chat.id) {
        setCurrentChatId(null);
        setMessages([]);
        router.replace('/');
        return;
      }
      
      // Ensure chatId matches (in case of redirects)
      if (chat.id !== chatId) {
        console.warn('Chat ID mismatch:', chatId, 'vs', chat.id);
      }
      
      // Update state atomically
      setCurrentChatId(chat.id);
      
      // Update browser title
      if (chat.title) {
        document.title = `${chat.title} - AI Sohbet Asistanı`;
      } else {
        document.title = 'AI Sohbet Asistanı';
      }
      
      // Ensure messages are properly loaded with all fields
      const loadedMessages = (chat.messages || []).map((msg: any) => ({
        id: msg.id, // Include message ID from database
        role: msg.role,
        content: msg.content || '',
        timestamp: msg.createdAt || new Date().toISOString(),
        isStreaming: false, // Ensure streaming flag is set
      }));
      
      // Debug: Log loaded messages to verify they're being loaded
      console.log('Loaded chat:', chat.id, 'Messages count:', loadedMessages.length);
      if (loadedMessages.length > 0) {
        console.log('First message:', loadedMessages[0]);
        console.log('Last message:', loadedMessages[loadedMessages.length - 1]);
      }
      
      setMessages(loadedMessages);
      
      // Clear loading flag
      loadingChatRef.current = null;
    } catch (error) {
      console.error('Error loading chat:', error);
      // On error, clear state to prevent UI issues
      setCurrentChatId(null);
      setMessages([]);
      loadingChatRef.current = null;
      document.title = 'AI Chat Assistant';
      router.replace('/');
    }
  };

  // Save streaming message to database
  const saveStreamingMessage = async (role: string, content: string, chatIdParam?: string | null) => {
    // Use provided chatId or fallback to currentChatId
    const chatIdToUse = chatIdParam !== undefined ? chatIdParam : currentChatId;
    
    if (!chatIdToUse) {
      console.warn('Cannot save message: no chatId');
      return;
    }
    
    if (!content || !content.trim()) {
      console.warn('Cannot save message: empty content');
      return;
    }
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatIdToUse,
          role,
          content: content.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error saving message:', response.status, errorText);
        return;
      }
      
      const savedMessage = await response.json();
      console.log('Message saved successfully:', savedMessage.id, role);
    } catch (error) {
      console.error('Error saving streaming message:', error);
    }
  };

  // Handle sending message
  const handleSend = async (content: string, fileData?: any, useWebSearch?: boolean) => {
    if ((!content.trim() && !fileData) || isLoading) return;
    
    // Check if provider and model are selected
    if (!selectedProvider) {
      alert('Lütfen bir LLM provider seçin');
      return;
    }
    
    if (!selectedModel) {
      alert('Lütfen bir model seçin. Provider ayarlarından model seçebilirsiniz.');
      return;
    }
    
    // Prepare message content with file information
    let messageContent = content.trim();
    
    // If web search is enabled, add search prefix to trigger web search
    if (useWebSearch && messageContent) {
      // Add search prefix to trigger web search detection
      messageContent = `web search ${messageContent}`;
    }
    
    if (fileData) {
      if (fileData.metadata?.format === 'text' && fileData.content) {
        // For text files, include content
        const fileInfo = `\n\n[Dosya: ${fileData.name}]\n\nDosya İçeriği:\n${fileData.content}`;
        messageContent = messageContent ? `${messageContent}${fileInfo}` : fileInfo;
      } else if (fileData.metadata?.format === 'base64' && fileData.metadata?.dataUrl) {
        // For images, include data URL in a special format that MessageBubble can parse
        // Use a special marker format that won't show as text but can be parsed for image display
        // Format: ![filename](data:image/type;base64,base64data)
        // MessageBubble will parse this and show only the image, not the base64 string
        const imageInfo = `\n\n![${fileData.name}](${fileData.metadata.dataUrl})`;
        messageContent = messageContent ? `${messageContent}${imageInfo}` : imageInfo;
      } else {
        // For other files, just mention the file
        const fileInfo = `\n\n[Dosya: ${fileData.name}]`;
        messageContent = messageContent ? `${messageContent}${fileInfo}` : fileInfo;
      }
    }

    // Validate and sanitize input
    const validation = validateMessage(messageContent);
    if (!validation.valid) {
      alert(validation.error || 'Geçersiz mesaj');
      return;
    }

    const sanitizedContent = validation.sanitized;

    // Create chat if doesn't exist
    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
      if (!chatId) return;
      // Update currentChatId state immediately
      setCurrentChatId(chatId);
    }

    const userMessage: Message = {
      role: 'user',
      content: sanitizedContent,
      timestamp: new Date().toISOString(),
    };

    // If editing, remove messages after the edited one
    let updatedMessages: Message[];
    if (isEditing && editingMessageId) {
      const messageIndex = messages.findIndex((msg) => msg.id === editingMessageId);
      if (messageIndex !== -1) {
        // First, remove the old message and all messages after it from UI immediately
        // This ensures the old message disappears from the UI right away
        updatedMessages = messages.slice(0, messageIndex);
        setMessages(updatedMessages);
        
        // Delete messages from database that come after the edited message
        if (currentChatId) {
          try {
            const response = await fetch(`/api/chats/${currentChatId}`);
            if (response.ok) {
              const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
              const chat = await safeJsonParse<any>(response);
              if (chat && chat.messages) {
                const dbMessageIndex = chat.messages.findIndex(
                  (msg: any) => msg.id === editingMessageId
                );
                if (dbMessageIndex !== -1) {
                  const messagesToDelete = chat.messages.slice(dbMessageIndex + 1);
                  for (const msg of messagesToDelete) {
                    try {
                      await fetch(`/api/messages/${msg.id}`, {
                        method: 'DELETE',
                      });
                    } catch (error) {
                      console.error('Error deleting message:', error);
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error loading chat for edit:', error);
          }
        }
        
        // Delete the old message from database
        if (currentChatId && editingMessageId) {
          try {
            await fetch(`/api/messages/${editingMessageId}`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.error('Error deleting old message:', error);
          }
        }
        
        // Now add the new message to UI
        updatedMessages = [...updatedMessages, userMessage];
        setMessages(updatedMessages);
      } else {
        updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
      }
      // Exit editing mode
      setIsEditing(false);
      setEditingMessageId(null);
    } else {
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
    }
    setInputValue(''); // Clear input after sending
    setIsLoading(true);

    // Save user message to database (pass chatId explicitly to avoid state timing issues)
    await saveStreamingMessage('user', sanitizedContent, chatId);
    
    // Update chat title immediately if this is the first message
    // Check if this is the first user message (before adding the new one)
    const isFirstMessage = messages.filter(msg => msg.role === 'user').length === 0;
    if (chatId && isFirstMessage) {
      // This is the first message, update title immediately
      const title = sanitizedContent.length > 200 
        ? sanitizedContent.substring(0, 200) 
        : sanitizedContent;
      
      try {
        const updateResponse = await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        
        if (updateResponse.ok) {
          // Title updated successfully, trigger sidebar refresh
          window.dispatchEvent(new Event('chatUpdated'));
        }
      } catch (error) {
        console.error('Error updating chat title:', error);
      }
    }
    
    // Trigger chat update event to refresh sidebar (chat should appear after first message)
    if (chatId) {
      // Trigger immediately to show chat in sidebar
      window.dispatchEvent(new Event('chatUpdated'));
      
      // Then trigger again after a delay to ensure title is updated
      setTimeout(() => {
        window.dispatchEvent(new Event('chatUpdated'));
      }, 300);
    }

    try {
      // Call API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: sanitizeMessageForAPI(msg.content),
          })),
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
          stream: true,
          chatId,
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Bir hata oluştu';
        try {
          // Clone response for error handling (response body can only be read once)
          const responseClone = response.clone();
          const { safeJsonParse } = await import('@/lib/utils/safe-fetch');
          const errorData = await safeJsonParse<any>(responseClone);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If parsing fails, use status text
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessageContent = '';
      let buffer = '';

      // Add placeholder AI message
      const aiMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Final decode: if there's a value, decode it with stream: false
              // Then process any remaining buffer
              if (value) {
                // Decode final chunk with stream: false to ensure complete decoding
                buffer += decoder.decode(value, { stream: false });
              } else if (buffer.trim()) {
                // If no value but buffer exists, try to finalize buffer
                try {
                  const finalDecoded = decoder.decode(new TextEncoder().encode(buffer), { stream: false });
                  buffer = finalDecoded;
                } catch (e) {
                  // If decode fails, use buffer as is
                }
              }
              
              // Process all remaining buffer content (including incomplete last line)
              if (buffer.trim()) {
                // Split by newline, but also process the last line even if it doesn't end with \n
                const lines = buffer.split('\n');
                
                // Process all complete lines (ending with \n)
                for (let i = 0; i < lines.length - 1; i++) {
                  const line = lines[i].trim();
                  if (line === '') continue;
                  
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                      break;
                    }
                    
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if (delta) {
                        console.log(`[Chat] Adding final delta from buffer: ${delta.substring(0, 100)}...`);
                        aiMessageContent += delta;
                        // Update UI immediately with final delta
                        setMessages((prev) =>
                          prev.map((msg, idx) =>
                            idx === prev.length - 1
                              ? { ...msg, content: aiMessageContent, isStreaming: true }
                              : msg
                          )
                        );
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  } else {
                    // Try to parse as JSON directly (Ollama format)
                    try {
                      const json = JSON.parse(line);
                      if (json.message?.content) {
                        const delta = json.message.content;
                        console.log(`[Chat] Adding final delta from buffer (Ollama format): ${delta.substring(0, 100)}...`);
                        aiMessageContent += delta;
                        // Update UI immediately with final delta
                        setMessages((prev) =>
                          prev.map((msg, idx) =>
                            idx === prev.length - 1
                              ? { ...msg, content: aiMessageContent, isStreaming: true }
                              : msg
                          )
                        );
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
                
                // Process the last incomplete line (if it exists and doesn't end with \n)
                const lastLine = lines[lines.length - 1].trim();
                if (lastLine) {
                  if (lastLine.startsWith('data: ')) {
                    const data = lastLine.slice(6).trim();
                    if (data !== '[DONE]') {
                      try {
                        const json = JSON.parse(data);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                          console.log(`[Chat] Adding final delta from incomplete last line: ${delta.substring(0, 100)}...`);
                          aiMessageContent += delta;
                          // Update UI immediately with final delta
                          setMessages((prev) =>
                            prev.map((msg, idx) =>
                              idx === prev.length - 1
                                ? { ...msg, content: aiMessageContent, isStreaming: true }
                                : msg
                            )
                          );
                        }
                      } catch (e) {
                        // Ignore parse errors
                      }
                    }
                  } else {
                    // Try to parse as JSON directly (Ollama format)
                    try {
                      const json = JSON.parse(lastLine);
                      if (json.message?.content) {
                        const delta = json.message.content;
                        console.log(`[Chat] Adding final delta from incomplete last line (Ollama format): ${delta.substring(0, 100)}...`);
                        aiMessageContent += delta;
                        // Update UI immediately with final delta
                        setMessages((prev) =>
                          prev.map((msg, idx) =>
                            idx === prev.length - 1
                              ? { ...msg, content: aiMessageContent, isStreaming: true }
                              : msg
                          )
                        );
                      }
                    } catch (e) {
                      // If last line is incomplete JSON, try to extract partial content
                      try {
                        const partialMatch = lastLine.match(/"content"\s*:\s*"([^"]*)/);
                        if (partialMatch && partialMatch[1]) {
                          console.log(`[Chat] Adding partial content from incomplete JSON: ${partialMatch[1].substring(0, 100)}...`);
                          aiMessageContent += partialMatch[1];
                          // Update UI immediately with final delta
                          setMessages((prev) =>
                            prev.map((msg, idx) =>
                              idx === prev.length - 1
                                ? { ...msg, content: aiMessageContent, isStreaming: true }
                                : msg
                            )
                          );
                        }
                      } catch (e2) {
                        // Ignore parse errors
                      }
                    }
                  }
                }
                
                // Clear buffer after processing
                buffer = '';
              }
              
              // Finalize message
              setMessages((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? { ...msg, content: aiMessageContent, isStreaming: false }
                    : msg
                )
              );
              setIsLoading(false);
              
              // Save final AI message to database
              if (aiMessageContent && chatId) {
                await saveStreamingMessage('assistant', aiMessageContent, chatId);
                // Trigger chat update event to refresh sidebar (for title update)
                window.dispatchEvent(new Event('chatUpdated'));
              }
              return;
            }

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines (ending with \n)
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              
              if (line.trim() === '') continue;
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  // Process any remaining buffer before finalizing
                  if (buffer.trim()) {
                    const remainingLines = buffer.split('\n').filter(l => l.trim());
                    for (const remainingLine of remainingLines) {
                      if (remainingLine.startsWith('data: ')) {
                        const remainingData = remainingLine.slice(6).trim();
                        if (remainingData !== '[DONE]') {
                          try {
                            const json = JSON.parse(remainingData);
                            const delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                              console.log(`[Chat] Adding final delta from buffer: ${delta.substring(0, 100)}...`);
                              aiMessageContent += delta;
                              // Update UI immediately with final delta
                              setMessages((prev) =>
                                prev.map((msg, idx) =>
                                  idx === prev.length - 1
                                    ? { ...msg, content: aiMessageContent, isStreaming: true }
                                    : msg
                                )
                              );
                            }
                          } catch (e) {
                            // Ignore parse errors
                          }
                        }
                      } else {
                        // Try to parse as JSON directly (Ollama format)
                        try {
                          const json = JSON.parse(remainingLine);
                          if (json.message?.content) {
                            const delta = json.message.content;
                            console.log(`[Chat] Adding final delta from buffer (Ollama format): ${delta.substring(0, 100)}...`);
                            aiMessageContent += delta;
                            // Update UI immediately with final delta
                            setMessages((prev) =>
                              prev.map((msg, idx) =>
                                idx === prev.length - 1
                                  ? { ...msg, content: aiMessageContent, isStreaming: true }
                                  : msg
                              )
                            );
                          }
                        } catch (e) {
                          // Ignore parse errors
                        }
                      }
                    }
                    // Clear buffer after processing
                    buffer = '';
                  }
                  
                  // Streaming complete - finalize message
                  setMessages((prev) =>
                    prev.map((msg, idx) =>
                      idx === prev.length - 1
                        ? { ...msg, content: aiMessageContent, isStreaming: false }
                        : msg
                    )
                  );
                  setIsLoading(false);
                  
                  // Save final AI message to database
                  if (aiMessageContent && chatId) {
                    await saveStreamingMessage('assistant', aiMessageContent, chatId);
                    // Trigger chat update event to refresh sidebar (for title update)
                    window.dispatchEvent(new Event('chatUpdated'));
                  }
                  return;
                }

                try {
                  const json = JSON.parse(data);
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    aiMessageContent += delta;
                    setMessages((prev) =>
                      prev.map((msg, idx) =>
                        idx === prev.length - 1
                          ? { ...msg, content: aiMessageContent }
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              } else {
                // Try to parse as JSON directly (Ollama format - no "data: " prefix)
                try {
                  const json = JSON.parse(line);
                  if (json.message?.content) {
                    const delta = json.message.content;
                    aiMessageContent += delta;
                    setMessages((prev) =>
                      prev.map((msg, idx) =>
                        idx === prev.length - 1
                          ? { ...msg, content: aiMessageContent }
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reading stream:', error);
          // Finalize message even on error
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? { ...msg, content: aiMessageContent, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
          
          // Save final AI message to database even on error
          if (aiMessageContent && chatId) {
            await saveStreamingMessage('assistant', aiMessageContent);
            window.dispatchEvent(new Event('chatUpdated'));
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Üzgünüm, bir hata oluştu: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new chat - create chat immediately
  const handleNewChat = async () => {
    try {
      // Create new chat immediately
      const chatId = await createNewChat();
      if (chatId) {
        setCurrentChatId(chatId);
        setMessages([]);
        setInputValue(''); // Clear input field
        setSidebarOpen(false);
        document.title = 'AI Sohbet Asistanı';
        // Update URL to /c/[chatId]
        router.replace(`/c/${chatId}`);
      } else {
        // If chat creation fails, just clear state
        setMessages([]);
        setCurrentChatId(null);
        setInputValue('');
        setSidebarOpen(false);
        document.title = 'AI Sohbet Asistanı';
        router.push('/');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      // On error, clear state
      setMessages([]);
      setCurrentChatId(null);
      setInputValue('');
      setSidebarOpen(false);
      document.title = 'AI Chat Assistant';
      router.push('/');
    }
  };

  // Export chat conversation
  const handleExport = async (format: 'pdf' | 'markdown' | 'json') => {
    if (!currentChatId) {
      alert('Sohbet seçilmedi');
      return;
    }

    try {
      if (format === 'pdf') {
        // For PDF, use Puppeteer server-side generation
        const response = await fetch(`/api/chats/${currentChatId}/export?format=pdf`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'PDF oluşturulamadı' }));
          throw new Error(errorData.error || 'PDF dışa aktarma için sohbet verisi alınamadı');
        }
        
        // Get PDF blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${currentChatId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // For Markdown and JSON, download directly from API
        const response = await fetch(`/api/chats/${currentChatId}/export?format=${format}`);
        if (!response.ok) {
          throw new Error(`${format} formatında dışa aktarma başarısız oldu`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${currentChatId}.${format === 'markdown' ? 'md' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Konuşma dışa aktarılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  // Load available providers and models
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/llm/providers');
        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data.providers || {});
        }
      } catch (error) {
        console.error('Error loading providers:', error);
      }
    };
    loadProviders();
  }, []);
  
  // Fetch models for a specific provider (from .env configuration)
  const fetchModelsForProvider = async (provider: string) => {
    try {
      const url = `/api/llm/providers/${provider}/models`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        
        // Update availableProviders with models for this provider
        setAvailableProviders((prev) => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            models: models,
          },
        }));
        
        // If this is the currently selected provider and no model is selected yet,
        // automatically select the first model
        if (provider === selectedProvider && !selectedModel && models && models.length > 0) {
          setSelectedModel(models[0]);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('ai-chat-selected-model', models[0]);
            } catch (error) {
              console.error('Error saving selected model to localStorage:', error);
            }
          }
        }
      } else {
        console.error(`Error fetching models for ${provider}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error fetching models for ${provider}:`, error);
    }
  };
  
  // Fetch models for selected provider when provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProvider) return;
      
      // Check if provider is configured in .env and fetch models
      try {
        const configResponse = await fetch(`/api/llm/config?provider=${selectedProvider}`);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.hasApiKey) {
            // Provider is configured in .env, fetch models
            await fetchModelsForProvider(selectedProvider);
          } else {
            // Provider not configured
            alert(`${selectedProvider} is not configured. Please add API key to .env file.`);
          }
        }
      } catch (error) {
        console.error('Error checking provider config:', error);
      }
    };
    
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  // Handle provider change
  const handleProviderChange = (provider: string, model: string | null) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onLoadChat={loadChat}
        onChatDeleted={(chatId) => {
          // If deleted chat is the current chat, clear state
          if (chatId === currentChatId) {
            setCurrentChatId(null);
            setMessages([]);
            setInputValue('');
            document.title = 'AI Sohbet Asistanı';
          }
        }}
        currentChatId={currentChatId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSearchClick={() => setShowSearchModal(true)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] px-4 py-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden rounded-lg p-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          {/* Model Display with Dropdown (for future model selection) */}
          <div className="flex-1 flex items-center gap-2 relative">
            <button
              onClick={() => {
                // For now, just show provider modal
                // In the future, this will show model dropdown when providers are active
                if (selectedProvider && availableProviders[selectedProvider]) {
                  setShowModelDropdown(!showModelDropdown);
                } else {
                  setShowProviderModal(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group"
              title={selectedProvider && selectedModel ? `${selectedProvider} - ${selectedModel}` : 'Model seç'}
            >
              <span className="text-lg font-semibold text-[var(--text-primary)]">
                {selectedProvider && selectedModel
                  ? `${availableProviders[selectedProvider]?.name || selectedProvider} - ${selectedModel}`
                  : selectedProvider
                  ? `${availableProviders[selectedProvider]?.name || selectedProvider}`
                  : 'AI Sohbet Asistanı'}
              </span>
              {(selectedProvider && availableProviders[selectedProvider]) && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-[var(--text-secondary)] transition-opacity ${
                    showModelDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
            </button>
            
            {/* Model Dropdown (for future use) */}
            {showModelDropdown && selectedProvider && availableProviders[selectedProvider] && (
              <>
                {/* Overlay to close dropdown on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModelDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      {availableProviders[selectedProvider].name} Modelleri
                    </div>
                    {availableProviders[selectedProvider].models.map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          handleProviderChange(selectedProvider, model);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          selectedModel === model
                            ? 'bg-[var(--selected-bg)] text-[var(--selected-text)] font-medium'
                            : 'text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              title={themeMounted && theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
            >
              {!themeMounted ? (
                // Show default icon during SSR to prevent hydration mismatch
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowProviderModal(true)}
              className="rounded-lg p-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              title="LLM Provider Ayarları"
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
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {currentChatId && (
              <div className="relative group" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="rounded-lg p-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                  title="Konuşmayı Dışa Aktar"
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
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                {/* Export Dropdown */}
                {showExportDropdown && (
                  <>
                    {/* Overlay to close dropdown on outside click */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            handleExport('pdf');
                            setShowExportDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          PDF Olarak Dışa Aktar
                        </button>
                        <button
                          onClick={() => {
                            handleExport('markdown');
                            setShowExportDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          Markdown Olarak Dışa Aktar
                        </button>
                        <button
                          onClick={() => {
                            handleExport('json');
                            setShowExportDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          JSON Olarak Dışa Aktar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)] px-2 sm:px-0">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4">
              <div className="text-center max-w-2xl w-full">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className="text-3xl font-semibold text-[var(--text-primary)]">Merhaba!</h2>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--text-primary)]"
                  >
                    <path d="M18 11c0-1.1-.9-2-2-2h-1c-.6 0-1.1.3-1.4.7L13 12l-1.6-2.3c-.3-.4-.8-.7-1.4-.7H9c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-6z"></path>
                    <path d="M9 11V9c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2"></path>
                    <path d="M12 8V6"></path>
                    <path d="M15 5V3"></path>
                    <path d="M9 5V3"></path>
                    <path d="M18 8c0-1.1-.9-2-2-2h-1"></path>
                    <path d="M6 8c0-1.1.9-2 2-2h1"></path>
                    <path d="M18 3c0-1.1-.9-2-2-2"></path>
                    <path d="M6 3c0-1.1.9-2 2-2"></path>
                  </svg>
                </div>
                <p className="text-[var(--text-secondary)]">Size nasıl yardımcı olabilirim?</p>
              </div>
            </div>
          ) : (
            <>
              <MessageList 
                messages={messages} 
                onEdit={async (content) => {
                  // Find the index of the message being edited
                  const messageIndex = messages.findIndex(
                    (msg) => msg.role === 'user' && msg.content === content
                  );
                  if (messageIndex !== -1) {
                    // Set editing mode
                    setIsEditing(true);
                    // Store the message index for later deletion
                    setEditingMessageId(messages[messageIndex].id || null);
                    // Set the input to the edited content
                    setInputValue(content);
                    // Scroll to input area
                    setTimeout(() => {
                      const inputArea = document.querySelector('textarea');
                      if (inputArea) {
                        inputArea.focus();
                        inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }
                    }, 100);
                  }
                }}
              />
              {isLoading && <ThinkingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <InputArea 
          onSend={handleSend} 
          isLoading={isLoading}
          initialValue={inputValue}
          onValueChange={setInputValue}
          currentChatId={currentChatId}
          isEditing={isEditing}
        />
      </div>

      {/* Provider Selector Modal */}
      {showProviderModal && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setShowProviderModal(false)}
          ></div>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-[90vh] flex flex-col relative overflow-visible">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0 relative z-10">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  LLM Provider Ayarları
                </h2>
                <button
                  onClick={() => setShowProviderModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-visible flex-1 relative z-0">
                <ProviderSelector
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  availableProviders={availableProviders}
                  onProviderChange={handleProviderChange}
                  onClose={() => setShowProviderModal(false)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onNewChat={handleNewChat}
        onLoadChat={loadChat}
        currentChatId={currentChatId}
      />
    </div>
  );
}

