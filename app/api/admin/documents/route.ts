import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET() {
  const auth = await requireRole('analyst');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const documents = await dbQuery(
    `SELECT id, file_name, file_type, file_size, ingested_at
     FROM documents ORDER BY ingested_at DESC LIMIT 200`
  );
  return NextResponse.json({ documents });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { id } = (await request.json()) as { id: string };
  await dbQuery(`DELETE FROM documents WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
