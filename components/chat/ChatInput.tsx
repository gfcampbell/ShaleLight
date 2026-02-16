'use client';

import { FormEvent, useState } from 'react';

export default function ChatInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}) {
  const [query, setQuery] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (!value || isLoading) return;
    onSubmit(value);
    setQuery('');
  };

  return (
    <form onSubmit={submit} className="border-t bg-white p-4">
      <div className="flex gap-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          className="min-h-16 flex-1 rounded border p-3"
          placeholder="Ask a question about your indexed documents..."
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Ask'}
        </button>
      </div>
    </form>
  );
}
