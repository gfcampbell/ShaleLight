import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const jobs = await dbQuery(
    `SELECT id, type, status, progress, processed_items, total_items, started_at, completed_at
     FROM jobs ORDER BY created_at DESC LIMIT 100`
  );
  return NextResponse.json({ jobs });
}
