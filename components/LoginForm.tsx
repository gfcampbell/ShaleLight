'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Login failed');
      setLoading(false);
      return;
    }
    router.push('/chat');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded border bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">Log in to ShaleLight</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <label className="mb-2 block text-sm font-medium">Username</label>
      <input
        className="mb-4 w-full rounded border p-2"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <label className="mb-2 block text-sm font-medium">Password</label>
      <input
        type="password"
        className="mb-4 w-full rounded border p-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button className="w-full rounded bg-slate-900 px-4 py-2 text-white" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}
