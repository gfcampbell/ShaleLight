import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { auditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const users = await dbQuery(
    `SELECT id, username, display_name, email, role, is_active, created_at, last_login_at
     FROM users ORDER BY created_at DESC`
  );
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = (await request.json()) as {
    username: string;
    password: string;
    role: 'admin' | 'analyst' | 'viewer';
    display_name?: string;
    email?: string;
  };
  const passwordHash = await hashPassword(body.password);
  const id = randomUUID();
  await dbQuery(
    `INSERT INTO users (id, username, display_name, email, password_hash, role, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
    [id, body.username, body.display_name || null, body.email || null, passwordHash, body.role]
  );
  auditLog(auth.userId || null, 'user_created', 'users', { id, username: body.username, role: body.role });
  return NextResponse.json({ id });
}
