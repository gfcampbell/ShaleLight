import { NextRequest, NextResponse } from 'next/server';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';
import { dbQuery } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { getIP } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = (body.username || '').trim();
  const password = body.password || '';
  const ip = getIP(request);

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const users = await dbQuery<{
    id: string;
    username: string;
    password_hash: string;
    role: 'admin' | 'analyst' | 'viewer';
    display_name: string | null;
    is_active: boolean;
  }>(
    `SELECT id, username, password_hash, role, display_name, is_active
     FROM users WHERE username = $1 LIMIT 1`,
    [username]
  );
  const user = users[0];
  if (!user || !user.is_active) {
    auditLog(null, 'login_failed', 'auth', { username }, ip);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    auditLog(user.id, 'login_failed', 'auth', { username }, ip);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name,
  });
  await setSessionCookie(token);

  await dbQuery(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(() => undefined);
  auditLog(user.id, 'login_success', 'auth', { username }, ip);
  return NextResponse.json({ ok: true });
}
