'use client';

import { Message } from '@/app/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  onEdit?: (content: string) => void;
}

export default function MessageList({ messages, onEdit }: MessageListProps) {
  return (
    <div className="space-y-0">
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} index={index} onEdit={onEdit} />
      ))}
    </div>
  );
}

