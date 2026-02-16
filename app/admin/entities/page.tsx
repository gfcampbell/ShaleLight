'use client';

import { useEffect, useState } from 'react';

interface Entity {
  id: string;
  canonical: string;
  type: string;
  frequency: number;
}

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => {
    fetch('/api/admin/entities')
      .then((r) => r.json())
      .then((d) => setEntities(d.entities || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Entities</h1>
      <div className="space-y-2">
        {entities.map((e) => (
          <div key={e.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{e.canonical}</div>
            <div className="text-slate-500">
              {e.type} - {e.frequency}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
