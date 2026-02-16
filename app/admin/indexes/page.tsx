'use client';

import { useEffect, useState } from 'react';

interface IndexRow {
  indexname: string;
  indexdef: string;
}

export default function AdminIndexesPage() {
  const [indexes, setIndexes] = useState<IndexRow[]>([]);
  useEffect(() => {
    fetch('/api/admin/indexes')
      .then((r) => r.json())
      .then((d) => setIndexes(d.indexes || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Indexes</h1>
      <div className="space-y-2">
        {indexes.map((i) => (
          <div key={i.indexname} className="rounded border p-3 text-sm">
            <div className="font-medium">{i.indexname}</div>
            <div className="truncate text-slate-500">{i.indexdef}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
