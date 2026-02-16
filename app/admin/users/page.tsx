'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }, []);

  return (
    <div className="rounded border bg-white p-4">
      <h1 className="mb-3 text-lg font-semibold">Users</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded border p-3 text-sm">
            <div className="font-medium">{u.username}</div>
            <div className="text-slate-500">
              {u.role} - {u.is_active ? 'active' : 'inactive'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
