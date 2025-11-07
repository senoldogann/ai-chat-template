export interface Message {
  id?: string; // Optional: only present for messages loaded from database
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

