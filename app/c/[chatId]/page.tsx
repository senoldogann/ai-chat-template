'use client';

import Chat from '@/app/components/Chat';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.chatId as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Chat initialChatId={chatId} />;
}

