'use client';

import { useEffect, useState } from 'react';

interface Setting {
  key: string;
  value: unknown;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Settings</h1>
      <div className="space-y-2">
        {settings.map((s) => (
          <div key={s.key} className="rounded border p-3 text-sm">
            <div className="font-medium">{s.key}</div>
            <pre className="overflow-x-auto text-slate-500">{JSON.stringify(s.value, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
