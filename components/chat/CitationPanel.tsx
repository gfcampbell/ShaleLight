'use client';

export interface Citation {
  index: number;
  document_id: string;
  file_name: string;
  snippet: string;
  metadata: Record<string, unknown>;
}

export default function CitationPanel({ citations }: { citations: Citation[] }) {
  return (
    <aside className="h-full overflow-y-auto border-l bg-white">
      <div className="p-4">
        <h2 className="mb-3 font-semibold">Citations ({citations.length})</h2>
        <div className="space-y-3">
          {citations.map((c) => (
            <div key={c.index} className="rounded border p-3 text-sm">
              <div className="mb-1 font-medium">
                [{c.index}] {c.file_name}
              </div>
              <p className="text-slate-600">{c.snippet}</p>
            </div>
          ))}
          {citations.length === 0 && <p className="text-sm text-slate-500">Citations appear here.</p>}
        </div>
      </div>
    </aside>
  );
}
