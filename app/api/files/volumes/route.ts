import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { discoverVolumes } from '@/lib/fileDiscovery';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const volumes = await discoverVolumes();
  return NextResponse.json({ volumes });
}
