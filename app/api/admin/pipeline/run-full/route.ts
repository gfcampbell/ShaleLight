import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { enqueueJob } from '@/lib/jobs/scheduler';
import { auditLog } from '@/lib/audit';

/**
 * Run full pipeline: crawl → ingest → embed
 * Enqueues a pipeline job that runs all stages in sequence.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  
  const body = (await request.json()) as { source_id?: string };
  const sourceId = body.source_id;
  
  if (!sourceId) {
    return NextResponse.json({ error: 'source_id is required' }, { status: 400 });
  }

  const jobId = await enqueueJob('pipeline', { source_id: sourceId }, auth.userId || null);
  
  auditLog(
    auth.userId || null,
    'pipeline_started',
    'jobs',
    { source_id: sourceId, jobId }
  );
  
  return NextResponse.json({ jobId });
}
