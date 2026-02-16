'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ChatInput from '@/components/chat/ChatInput';
import ChatMessages, { Message } from '@/components/chat/ChatMessages';
import CitationPanel, { Citation } from '@/components/chat/CitationPanel';

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'citation'; citation: Citation }
  | { type: 'done' }
  | { type: 'error'; error: string };

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialQueryProcessed = useRef(false);

  const handleSubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setCitations([]);

    setMessages((prev) => [...prev, { role: 'user', content: query }, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history: messages }),
      });
      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setIsStreaming(true);
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === 'text') {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + event.content };
              }
              return copy;
            });
          }
          if (event.type === 'citation') {
            setCitations((prev) => {
              if (prev.find((c) => c.index === event.citation.index)) return prev;
              return [...prev, event.citation].sort((a, b) => a.index - b.index);
            });
          }
          if (event.type === 'error') setError(event.error);
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Request failed');
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [messages]);

  // The guard ref ensures this runs only once for initial URL query hydration.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true;
      handleSubmit(q);
    }
  }, [searchParams, handleSubmit]);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Navigation />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {error && (
            <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}
          <ChatMessages messages={messages} isLoading={isLoading} isStreaming={isStreaming} />
          <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
        </main>
        <div className="hidden w-96 lg:block">
          <CitationPanel citations={citations} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
