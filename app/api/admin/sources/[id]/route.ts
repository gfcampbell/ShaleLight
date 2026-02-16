import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  
  const { id } = await params;
  
  // Get source info for audit log
  const sources = await dbQuery<{ name: string; path: string }>(
    `SELECT name, path FROM crawl_sources WHERE id = $1`,
    [id]
  );
  
  if (!sources[0]) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
  
  // Delete source (cascade will handle related records)
  await dbQuery(`DELETE FROM crawl_sources WHERE id = $1`, [id]);
  
  auditLog(
    auth.userId || null,
    'source_deleted',
    'crawl_sources',
    { id, name: sources[0].name, path: sources[0].path }
  );
  
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  
  const { id } = await params;
  const body = await request.json();
  
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (body.enabled !== undefined) {
    updates.push(`enabled = $${idx++}`);
    values.push(body.enabled);
  }
  if (body.name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(body.name);
  }
  
  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }
  
  values.push(id);
  await dbQuery(
    `UPDATE crawl_sources SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  );
  
  auditLog(auth.userId || null, 'source_updated', 'crawl_sources', { id, updates: body });
  
  return NextResponse.json({ ok: true });
}
