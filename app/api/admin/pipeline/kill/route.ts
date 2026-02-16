import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';
import { cancelJob } from '@/lib/jobs/scheduler';

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { id } = (await request.json()) as { id: string };
  // Signal the running job to stop, then mark it failed in DB
  cancelJob(id);
  await dbQuery(`UPDATE jobs SET status = 'failed', error_message = 'Killed by admin', completed_at = NOW() WHERE id = $1`, [
    id,
  ]);
  return NextResponse.json({ ok: true });
}
