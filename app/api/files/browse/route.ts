import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { browseDirectory, PathNotAllowedError } from '@/lib/fileDiscovery';

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const path = request.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });

  try {
    const entries = await browseDirectory(path);
    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof PathNotAllowedError) {
      return NextResponse.json({ error: 'Path not allowed' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to browse directory' }, { status: 500 });
  }
}
