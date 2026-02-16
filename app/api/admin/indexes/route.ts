import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const indexes = await dbQuery(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public'
     ORDER BY indexname`
  );
  return NextResponse.json({ indexes });
}
