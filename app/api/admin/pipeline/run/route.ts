import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { enqueueJob } from '@/lib/jobs/scheduler';
import { auditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = (await request.json()) as { type: string; source_id?: string };
  const jobId = await enqueueJob(body.type, { source_id: body.source_id }, auth.userId || null);
  auditLog(auth.userId || null, 'job_started', 'jobs', { type: body.type, jobId });
  return NextResponse.json({ jobId });
}
