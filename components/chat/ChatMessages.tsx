'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Citation {
  index: number;
  document_id: string;
  file_name: string;
  snippet: string;
  metadata: Record<string, unknown>;
}

export default function ChatMessages({
  messages,
  isStreaming,
  isLoading,
}: {
  messages: Message[];
  isStreaming?: boolean;
  isLoading?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
        Ask a question to search your documents.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {messages.map((message, idx) => (
          <div key={idx} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[90%] rounded p-3 ${
                message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border'
              }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {(isLoading || isStreaming) && <div className="text-sm text-slate-500">Researching...</div>}
      </div>
      <div ref={endRef} />
    </div>
  );
}
