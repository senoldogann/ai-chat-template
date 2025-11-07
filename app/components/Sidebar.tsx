'use client';

import { useState, useEffect } from 'react';
import { safeJsonParse } from '@/lib/utils/safe-fetch';

interface Chat {
  id: string;
  title: string | null;
  createdAt: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onLoadChat?: (chatId: string) => void;
  onChatDeleted?: (chatId: string) => void;
  currentChatId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSearchClick?: () => void;
}

export default function Sidebar({ isOpen, onClose, onNewChat, onLoadChat, onChatDeleted, currentChatId, isCollapsed = false, onToggleCollapse, onSearchClick }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Load chats from database
  useEffect(() => {
    loadChats();
    
    // Listen for chat updates
    const handleChatUpdate = () => {
      loadChats();
    };
    window.addEventListener('chatUpdated', handleChatUpdate);
    
    return () => {
      window.removeEventListener('chatUpdated', handleChatUpdate);
    };
  }, []);

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
      // Set empty array on error to prevent UI issues
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chatId: string) => {
    if (onLoadChat) {
      // Call loadChat immediately
      onLoadChat(chatId);
    }
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    loadChats(); // Refresh chat list
  };

  // Delete chat
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat: ${response.status} ${response.statusText}`);
      }

      // Remove chat from local state
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));

      // If deleted chat is the current chat, notify parent
      if (onChatDeleted && chatId === currentChatId) {
        onChatDeleted(chatId);
      }

      // Trigger chat update event
      window.dispatchEvent(new Event('chatUpdated'));
    } catch (error) {
      console.error('Error deleting chat:', error);
      // Silently fail - don't show alert
    }
  };
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 h-full transform bg-[var(--bg-sidebar)] transition-all duration-300 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className="flex h-full flex-col">
          {/* Header with ChatGPT logo and collapse button */}
          <div className="flex items-center justify-between p-4">
            {/* ChatGPT Logo - Shows expand icon on hover when collapsed */}
            {isCollapsed ? (
              <div className="relative w-full flex items-center justify-center">
                <button
                  onClick={onToggleCollapse}
                  className="group relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                  title="Genişlet"
                >
                  {/* Logo - visible when collapsed */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--text-primary)] opacity-100 group-hover:opacity-0 transition-opacity"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  {/* Expand icon - shows on hover */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--text-primary)] absolute opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" fill="none"></rect>
                    <rect x="14" y="6" width="6" height="12" rx="1" fill="currentColor"></rect>
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--text-primary)]"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                {/* Collapse/Expand Button */}
                {onToggleCollapse ? (
                  <button
                    onClick={onToggleCollapse}
                    className="rounded-lg p-1.5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                    title="Daralt"
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
                      <rect x="3" y="3" width="18" height="18" rx="2" fill="none"></rect>
                      <rect x="14" y="6" width="6" height="12" rx="1" fill="currentColor"></rect>
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="lg:hidden rounded-lg p-1.5 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                    title="Kapat"
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
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Menu Items - Only show icons when collapsed */}
          {isCollapsed ? (
            <div className="px-2 pb-2 space-y-1">
              {/* New Chat Icon Button */}
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center rounded-lg p-2.5 text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                title="Yeni sohbet"
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
              </button>

              {/* Search Icon Button */}
              <button
                onClick={() => {
                  if (onSearchClick) {
                    onSearchClick();
                  } else {
                    setIsSearchActive(true);
                  }
                }}
                className="w-full flex items-center justify-center rounded-lg p-2.5 text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                title="Sohbetleri ara"
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
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </div>
          ) : (
            <div className="px-2 pb-2 space-y-1">
              {/* New Chat Button */}
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

              {/* Search Chats */}
              <button
                onClick={() => {
                  if (onSearchClick) {
                    onSearchClick();
                  } else {
                    setIsSearchActive(true);
                  }
                }}
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
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <span>Sohbetleri ara</span>
              </button>
            </div>
          )}

          {/* Content */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto p-2">
              {/* Chats Header */}
              <div className="px-2 py-2 mb-2">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Sohbetler
                </h3>
              </div>
              {loading ? (
                <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                  Yükleniyor...
                </div>
              ) : (() => {
                // Filter chats based on search query
                const filteredChats = searchQuery.trim()
                  ? chats.filter((chat) =>
                      (chat.title || 'Yeni Sohbet').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : chats;

                if (filteredChats.length === 0) {
                  return (
                    <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                      {searchQuery.trim() ? 'Sohbet bulunamadı' : 'Henüz sohbet geçmişi yok'}
                    </div>
                  );
                }

                return (
                  <div className="space-y-1">
                    {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group relative w-full rounded-lg px-4 py-3 text-left text-sm transition-all ${
                      currentChatId === chat.id
                        ? 'bg-[var(--hover-bg)] text-[var(--text-primary)] font-medium shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <button
                      onClick={() => handleChatClick(chat.id)}
                      className="w-full truncate pr-8 text-left cursor-pointer"
                    >
                      {chat.title || 'Yeni Sohbet'}
                    </button>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--hover-bg)] transition-all cursor-pointer"
                      title="Sohbeti Sil"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                    </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

