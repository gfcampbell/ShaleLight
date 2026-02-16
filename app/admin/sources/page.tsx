'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  name: string;
  path: string;
  source_type: string;
  enabled: boolean;
  document_count: number;
  last_crawled_at: string | null;
}

interface FileIndexEntry {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  discovered_at: string;
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', path: '' });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSources = async () => {
    const r = await fetch('/api/admin/sources');
    const d = await r.json();
    setSources(d.sources || []);
  };

  const loadFiles = async (sourceId: string) => {
    const r = await fetch(`/api/admin/indexes?source_id=${sourceId}`);
    const d = await r.json();
    setFiles(d.files || []);
  };

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (selectedSourceId) {
      loadFiles(selectedSourceId);
      const interval = setInterval(() => loadFiles(selectedSourceId), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSourceId]);

  const addSource = async () => {
    if (!newSource.name || !newSource.path) return;
    setLoading(true);
    await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSource),
    });
    setNewSource({ name: '', path: '' });
    setShowAddForm(false);
    await loadSources();
    setLoading(false);
  };

  const deleteSource = async (id: string) => {
    if (!confirm('Delete this source and all its indexed documents?')) return;
    setLoading(true);
    await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
    await loadSources();
    if (selectedSourceId === id) setSelectedSourceId(null);
    setLoading(false);
  };

  const toggleSource = async (id: string, enabled: boolean) => {
    setLoading(true);
    await fetch(`/api/admin/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    await loadSources();
    setLoading(false);
  };

  const runCrawl = async (sourceId: string) => {
    setLoading(true);
    await fetch('/api/admin/pipeline/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'crawl', source_id: sourceId }),
    });
    setLoading(false);
    setSelectedSourceId(sourceId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Document Sources</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Source'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 font-medium">Add Document Source</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className="w-full rounded border p-2 text-sm"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="My Documents"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Path</label>
              <input
                className="w-full rounded border p-2 text-sm font-mono"
                value={newSource.path}
                onChange={(e) => setNewSource({ ...newSource, path: e.target.value })}
                placeholder="/Volumes/data/documents"
              />
              <p className="mt-1 text-xs text-slate-500">
                Local filesystem path accessible from the server
              </p>
            </div>
            <button
              onClick={addSource}
              disabled={loading || !newSource.name || !newSource.path}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="rounded border bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{s.name}</h3>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {s.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-slate-600">{s.path}</p>
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>{s.document_count} documents</span>
                  {s.last_crawled_at && (
                    <span>Last crawled: {new Date(s.last_crawled_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSource(s.id, !s.enabled)}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                  disabled={loading}
                >
                  {s.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => runCrawl(s.id)}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  disabled={loading}
                >
                  Crawl Now
                </button>
                <button
                  onClick={() =>
                    setSelectedSourceId(selectedSourceId === s.id ? null : s.id)
                  }
                  className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  {selectedSourceId === s.id ? 'Hide Files' : 'View Files'}
                </button>
                <button
                  onClick={() => deleteSource(s.id)}
                  className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>

            {selectedSourceId === s.id && (
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-2 text-sm font-medium">Discovered Files ({files.length})</h4>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded bg-slate-50 p-2">
                  {files.length === 0 && (
                    <p className="text-sm text-slate-500">No files discovered yet. Run a crawl.</p>
                  )}
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded bg-white p-2 text-xs"
                    >
                      <div className="flex-1">
                        <span className="font-mono">{f.file_name}</span>
                        <span className="ml-2 text-slate-400">
                          ({(f.file_size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 ${
                          f.status === 'ingested'
                            ? 'bg-green-100 text-green-700'
                            : f.status === 'discovered'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {sources.length === 0 && !showAddForm && (
          <div className="rounded border bg-white p-8 text-center">
            <p className="mb-2 text-slate-500">No document sources configured yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Add Your First Source
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
