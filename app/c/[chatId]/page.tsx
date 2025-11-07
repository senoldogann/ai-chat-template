'use client';

import Chat from '@/app/components/Chat';
import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function ChatPage() {
  const params = useParams();
  const chatId = useMemo(() => params?.chatId as string, [params?.chatId]);
  const [mounted, setMounted] = useState(false);

  // Use startTransition to avoid calling setState synchronously in effect
  useEffect(() => {
    // Use setTimeout to defer state update
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Chat initialChatId={chatId} />;
}

