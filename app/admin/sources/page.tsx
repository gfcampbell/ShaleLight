'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  name: string;
  path: string;
  source_type: string;
  enabled: boolean;
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    fetch('/api/admin/sources')
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Sources</h1>
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{s.name}</div>
            <div className="text-slate-500">{s.path}</div>
          </div>
        ))}
        {sources.length === 0 && <p className="text-sm text-slate-500">No sources configured.</p>}
      </div>
    </div>
  );
}
