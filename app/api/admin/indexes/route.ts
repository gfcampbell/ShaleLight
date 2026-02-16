import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('source_id');
  
  // If source_id is provided, return file_index entries for that source
  if (sourceId) {
    const files = await dbQuery(
      `SELECT id, file_path, file_name, file_type, file_size, status, discovered_at
       FROM file_index
       WHERE source_id = $1
       ORDER BY discovered_at DESC
       LIMIT 1000`,
      [sourceId]
    );
    return NextResponse.json({ files });
  }
  
  // Otherwise return database indexes
  const indexes = await dbQuery(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public'
     ORDER BY indexname`
  );
  return NextResponse.json({ indexes });
}
