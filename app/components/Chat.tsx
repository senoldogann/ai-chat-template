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
import ProviderConfig from './ProviderConfig';
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configProvider, setConfigProvider] = useState<string | null>(null);
  // Load provider configs from localStorage on mount
  const [providerConfigs, setProviderConfigs] = useState<Record<string, { apiKey?: string; baseURL?: string; model?: string; temperature?: number; maxTokens?: number }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ai-chat-provider-configs');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.error('Error loading provider configs from localStorage:', error);
      }
    }
    return {};
  });
  
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingChatRef = useRef<string | null>(null); // Track which chat is currently loading
  const { theme, toggleTheme } = useTheme();
  
  // Save provider configs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai-chat-provider-configs', JSON.stringify(providerConfigs));
      } catch (error) {
        console.error('Error saving provider configs to localStorage:', error);
      }
    }
  }, [providerConfigs]);
  
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
      if (initialChatId !== currentChatId && loadingChatRef.current !== initialChatId) {
        // Update URL first, then load chat
        router.replace(`/c/${initialChatId}`);
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
              document.title = `${chat.title} - AI Chat Assistant`;
            } else {
              document.title = 'AI Chat Assistant';
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
    // Only skip if it's the exact same chat with messages already loaded
    // We need to check if messages are actually loaded, not just if currentChatId matches
    const hasMessages = messages.length > 0 && messages.some(msg => msg.content && msg.content.trim() !== '');
    if (currentChatId === chatId && hasMessages) {
      console.log('Chat already loaded with messages, skipping:', chatId);
      return;
    }
    
    // If chatId is different from current, always load
    // This ensures chat loads on first click from Sidebar
    // No need to check anything else - just load it

    try {
      // Mark as loading
      loadingChatRef.current = chatId;
      
      // Clear messages and set chatId immediately to show loading state
      // This ensures UI updates immediately
      setMessages([]);
      setCurrentChatId(chatId);
      
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
        document.title = `${chat.title} - AI Chat Assistant`;
      } else {
        document.title = 'AI Chat Assistant';
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
          apiKey: selectedProvider && providerConfigs[selectedProvider]?.apiKey ? providerConfigs[selectedProvider].apiKey : undefined,
          baseURL: selectedProvider && providerConfigs[selectedProvider]?.baseURL ? providerConfigs[selectedProvider].baseURL : undefined,
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
              // Process any remaining buffer before finalizing
              if (buffer.trim()) {
                const lines = buffer.split('\n').filter(line => line.trim());
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                      break;
                    }
                    
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if (delta) {
                        console.log(`[Chat] Adding delta to message: ${delta.substring(0, 100)}...`);
                        aiMessageContent += delta;
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
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

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
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
                              console.log(`[Chat] Adding delta from buffer: ${delta.substring(0, 100)}...`);
                              aiMessageContent += delta;
                            }
                          } catch (e) {
                            // Ignore parse errors
                          }
                        }
                      }
                    }
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
                    await saveStreamingMessage('assistant', aiMessageContent);
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
        document.title = 'AI Chat Assistant';
        // Update URL to /c/[chatId]
        router.replace(`/c/${chatId}`);
      } else {
        // If chat creation fails, just clear state
        setMessages([]);
        setCurrentChatId(null);
        setInputValue('');
        setSidebarOpen(false);
        document.title = 'AI Chat Assistant';
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
  
  // Fetch models for a specific provider
  const fetchModelsForProvider = async (provider: string, apiKey?: string, baseURL?: string) => {
    try {
      let url = `/api/llm/providers/${provider}/models`;
      if (apiKey || baseURL) {
        const params = new URLSearchParams();
        if (apiKey) params.append('apiKey', apiKey);
        if (baseURL) params.append('baseURL', baseURL);
        url += `?${params.toString()}`;
      }
      
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
      } else {
        console.error(`Error fetching models for ${provider}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error fetching models for ${provider}:`, error);
    }
  };
  
  // Fetch models for selected provider when provider or config changes
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProvider) return;
      
      // Get provider config (from localStorage)
      const config = providerConfigs[selectedProvider];
      const apiKey = config?.apiKey;
      const baseURL = config?.baseURL;
      
      // If no API key in config, try to get from .env (provider might be configured)
      if (!apiKey) {
        try {
          const configResponse = await fetch(`/api/llm/config?provider=${selectedProvider}`);
          if (configResponse.ok) {
            const configData = await configResponse.json();
            if (configData.hasApiKey) {
              // Provider is configured in .env, fetch models
              await fetchModelsForProvider(selectedProvider);
            }
          }
        } catch (error) {
          console.error('Error checking provider config:', error);
        }
      } else {
        // Provider has API key in config, fetch models
        await fetchModelsForProvider(selectedProvider, apiKey, baseURL);
      }
    };
    
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, providerConfigs]);

  // Handle provider change
  const handleProviderChange = (provider: string, model: string | null) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  // Handle provider config update
  const handleProviderConfigUpdate = (provider: string, config: any) => {
    setProviderConfigs((prev) => ({
      ...prev,
      [provider]: config,
    }));
    
    // Fetch models after config is updated
    if (config?.apiKey) {
      fetchModelsForProvider(provider, config.apiKey, config.baseURL);
    }
  };

  // Handle config modal open
  const handleOpenConfig = (provider: string) => {
    setConfigProvider(provider);
    setShowConfigModal(true);
  };

  // Handle config modal close
  const handleCloseConfig = () => {
    setShowConfigModal(false);
    setConfigProvider(null);
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
            document.title = 'AI Chat Assistant';
          }
        }}
        currentChatId={currentChatId}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSearchClick={() => setShowSearchModal(true)}
      />

      <div className="flex flex-1 flex-col">
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
                  : 'AI Chat Assistant'}
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
                            ? 'bg-[var(--accent-color)] text-white'
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
              title={theme === 'dark' ? 'Açık moda geç' : 'Koyu moda geç'}
            >
              {theme === 'dark' ? (
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
            <button
              onClick={handleNewChat}
              className="rounded-lg p-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
              title="Yeni Sohbet"
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
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
                  onProviderChange={handleProviderChange}
                  providerConfigs={providerConfigs}
                  onProviderConfigUpdate={handleProviderConfigUpdate}
                  onOpenConfig={handleOpenConfig}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Provider Config Modal - Rendered outside Provider Modal */}
      {showConfigModal && configProvider && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/70"
            onClick={handleCloseConfig}
          ></div>
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative z-[300] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Configure {configProvider}
                </h3>
                <button
                  onClick={handleCloseConfig}
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
              <ProviderConfig
                provider={configProvider}
                onConfigUpdate={(config) => {
                  handleProviderConfigUpdate(configProvider, config);
                  handleCloseConfig();
                }}
                isStandalone={true}
              />
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

