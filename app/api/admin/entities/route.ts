import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET() {
  const auth = await requireRole('analyst');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const entities = await dbQuery(
    `SELECT id, canonical, type, frequency, variants
     FROM entities
     ORDER BY frequency DESC
     LIMIT 200`
  );
  return NextResponse.json({ entities });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = (await request.json()) as { id: string; type?: string; canonical?: string };
  await dbQuery(
    `UPDATE entities
     SET type = COALESCE($2, type),
         canonical = COALESCE($3, canonical)
     WHERE id = $1`,
    [body.id, body.type || null, body.canonical || null]
  );
  return NextResponse.json({ ok: true });
}
