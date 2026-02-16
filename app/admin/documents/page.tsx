'use client';

import { useEffect, useState } from 'react';

interface Doc {
  id: string;
  file_name: string;
  file_type: string;
  ingested_at: string;
}

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    fetch('/api/admin/documents')
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Documents</h1>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{d.file_name}</div>
            <div className="text-slate-500">{d.file_type}</div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-slate-500">No documents indexed.</p>}
      </div>
    </div>
  );
}
