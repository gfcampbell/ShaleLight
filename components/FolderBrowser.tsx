'use client';

import { useEffect, useState } from 'react';

interface VolumeInfo {
  name: string;
  path: string;
  type: string;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

interface FolderBrowserProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export default function FolderBrowser({ onSelect, onCancel }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load volumes on mount
  useEffect(() => {
    loadVolumes();
  }, []);

  // Browse directory when currentPath changes
  useEffect(() => {
    if (currentPath) {
      browse(currentPath);
    }
  }, [currentPath]);

  const loadVolumes = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/files/volumes');
      const d = await r.json();
      setVolumes(d.volumes || []);
    } catch (err) {
      setError('Failed to load volumes');
    } finally {
      setLoading(false);
    }
  };

  const browse = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/files/browse?path=${encodeURIComponent(path)}`);
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'Failed to browse directory');
      }
      const d = await r.json();
      setEntries(d.entries || []);
    } catch (err: any) {
      setError(err.message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 2) {
      // Back to volumes
      setCurrentPath(null);
      setEntries([]);
    } else {
      parts.pop();
      setCurrentPath('/' + parts.join('/'));
    }
  };

  const breadcrumbs = currentPath
    ? currentPath.split('/').filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Select Folder</h2>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          {currentPath && (
            <div className="mt-2 flex items-center gap-1 text-sm text-slate-600">
              <button
                onClick={() => {
                  setCurrentPath(null);
                  setEntries([]);
                }}
                className="hover:text-slate-900"
              >
                Volumes
              </button>
              {breadcrumbs.map((part, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>/</span>
                  <button
                    onClick={() => {
                      const newPath = '/' + breadcrumbs.slice(0, i + 1).join('/');
                      setCurrentPath(newPath);
                    }}
                    className="hover:text-slate-900"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="h-96 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-full items-center justify-center text-slate-500">
              Loading...
            </div>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && !currentPath && (
            <div className="space-y-2">
              {volumes.map((vol) => (
                <button
                  key={vol.path}
                  onClick={() => setCurrentPath(vol.path)}
                  className="flex w-full items-center gap-3 rounded border p-3 text-left hover:bg-slate-50"
                >
                  <span className="text-2xl">💾</span>
                  <div>
                    <div className="font-medium">{vol.name}</div>
                    <div className="text-sm text-slate-500">{vol.path}</div>
                  </div>
                </button>
              ))}
              {volumes.length === 0 && (
                <p className="text-sm text-slate-500">No volumes found</p>
              )}
            </div>
          )}

          {!loading && !error && currentPath && (
            <div className="space-y-1">
              {currentPath !== '/' && (
                <button
                  onClick={navigateUp}
                  className="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-slate-50"
                >
                  <span className="text-xl">⬆️</span>
                  <span className="font-medium">..</span>
                </button>
              )}
              {entries
                .filter((e) => e.isDirectory)
                .map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => setCurrentPath(entry.path)}
                    className="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-xl">📁</span>
                    <span>{entry.name}</span>
                  </button>
                ))}
              {entries.filter((e) => e.isDirectory).length === 0 && (
                <p className="py-4 text-sm text-slate-500">No folders in this directory</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <button
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => currentPath && onSelect(currentPath)}
            disabled={!currentPath}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  );
}
