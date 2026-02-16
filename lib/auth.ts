import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { dbQuery } from '@/lib/db';
import { randomUUID } from 'crypto';

const SESSION_COOKIE = 'shale_session';
const SESSION_HOURS = 24;

export type Role = 'admin' | 'analyst' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  display_name: string | null;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: AuthUser): Promise<string> {
  const token = jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    getJwtSecret(),
    { expiresIn: `${SESSION_HOURS}h` }
  );
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await dbQuery(
    `INSERT INTO sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), user.id, token, expiresAt.toISOString()]
  );
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { sub: string };
    const users = await dbQuery<AuthUser & { is_active: boolean }>(
      `SELECT id, username, role, display_name, is_active
       FROM users WHERE id = $1`,
      [decoded.sub]
    );
    if (!users[0]?.is_active) return null;

    const sessions = await dbQuery<{ id: string }>(
      `SELECT id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );
    if (!sessions[0]) return null;

    const { is_active, ...user } = users[0];
    return user;
  } catch {
    return null;
  }
}

export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await dbQuery(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
  await clearSessionCookie();
}
