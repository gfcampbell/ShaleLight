import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET() {
  const auth = await requireRole('analyst');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const [queries] = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM queries`).catch(() => [
    { count: '0' },
  ]);
  const [documents] = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM documents`).catch(() => [
    { count: '0' },
  ]);
  const [chunks] = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM chunks`).catch(() => [
    { count: '0' },
  ]);

  return NextResponse.json({
    metrics: {
      queries: Number(queries.count || 0),
      documents: Number(documents.count || 0),
      chunks: Number(chunks.count || 0),
    },
  });
}
