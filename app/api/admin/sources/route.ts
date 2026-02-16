import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';
import { randomUUID } from 'crypto';
import { auditLog } from '@/lib/audit';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const sources = await dbQuery(
    `SELECT id, name, path, source_type, enabled, schedule, file_types, recursive, max_depth
     FROM crawl_sources ORDER BY created_at DESC`
  );
  return NextResponse.json({ sources });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = await request.json();
  const id = randomUUID();
  await dbQuery(
    `INSERT INTO crawl_sources
     (id, name, path, source_type, enabled, schedule, file_types, recursive, max_depth, created_by)
     VALUES ($1,$2,$3,$4,TRUE,$5,$6,$7,$8,$9)`,
    [
      id,
      body.name,
      body.path,
      body.source_type || 'local',
      body.schedule || '*/30 * * * *',
      body.file_types || ['pdf', 'xlsx', 'csv', 'docx'],
      body.recursive ?? true,
      body.max_depth ?? 10,
      auth.userId || null,
    ]
  );
  auditLog(auth.userId || null, 'source_created', 'crawl_sources', { id, name: body.name, path: body.path });
  return NextResponse.json({ id });
}
