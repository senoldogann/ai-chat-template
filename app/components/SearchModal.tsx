'use client';

import { useState, useEffect } from 'react';
import { safeJsonParse } from '@/lib/utils/safe-fetch';

/**
 * Search Modal Component
 * Displays a modal for searching and selecting chats
 */

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onLoadChat?: (chatId: string) => void;
  currentChatId: string | null;
}

export default function SearchModal({
  isOpen,
  onClose,
  onNewChat,
  onLoadChat,
  currentChatId,
}: SearchModalProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load chats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadChats();
      // Focus search input when modal opens
      setTimeout(() => {
        const input = document.getElementById('search-modal-input');
        if (input) {
          input.focus();
        }
      }, 100);
    } else {
      // Clear search when modal closes
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chats');
      
      if (!response.ok) {
        throw new Error(`Failed to load chats: ${response.status} ${response.statusText}`);
      }
      
      const data = await safeJsonParse<Chat[]>(response);
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chatId: string) => {
    if (onLoadChat) {
      onLoadChat(chatId);
    }
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  // Filter chats based on search query
  const filteredChats = searchQuery.trim()
    ? chats.filter((chat) =>
        (chat.title || 'Yeni Sohbet').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  // Group chats by date
  const groupChatsByDate = (chats: Chat[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: { label: string; chats: Chat[] }[] = [
      { label: 'Bugün', chats: [] },
      { label: 'Dün', chats: [] },
      { label: 'Önceki 7 Gün', chats: [] },
      { label: 'Daha Eski', chats: [] },
    ];

    chats.forEach((chat) => {
      const chatDate = new Date(chat.createdAt);
      
      if (chatDate >= today) {
        groups[0].chats.push(chat);
      } else if (chatDate >= yesterday) {
        groups[1].chats.push(chat);
      } else if (chatDate >= weekAgo) {
        groups[2].chats.push(chat);
      } else {
        groups[3].chats.push(chat);
      }
    });

    // Remove empty groups
    return groups.filter((group) => group.chats.length > 0);
  };

  const groupedChats = groupChatsByDate(filteredChats);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl max-h-[80vh] flex flex-col overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Search Input */}
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                id="search-modal-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sohbetleri ara..."
                className="w-full rounded-lg px-3 py-2.5 pl-10 pr-10 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-color)] focus:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
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
                    className="text-[var(--text-secondary)]"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-2 border-b border-[var(--border-color)]">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
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
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Yeni sohbet</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                Yükleniyor...
              </div>
            ) : groupedChats.length === 0 ? (
              <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                {searchQuery.trim() ? 'Sohbet bulunamadı' : 'Henüz sohbet geçmişi yok'}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedChats.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <div className="px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.chats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                          currentChatId === chat.id
                            ? 'bg-[var(--hover-bg)] text-[var(--text-primary)] font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                        }`}
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
                          className="flex-shrink-0"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span className="truncate flex-1">{chat.title || 'Yeni Sohbet'}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

