'use client';

import { useEffect, useState } from 'react';

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
}

export default function AdminPipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch('/api/admin/pipeline/status')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Pipeline</h1>
      <div className="space-y-2">
        {jobs.map((j) => (
          <div key={j.id} className="rounded border p-3 text-sm">
            <div className="font-medium">
              {j.type} - {j.status}
            </div>
            <div className="text-slate-500">Progress: {j.progress}%</div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-sm text-slate-500">No jobs.</p>}
      </div>
    </div>
  );
}
