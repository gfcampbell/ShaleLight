import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getProvider } from '@/lib/ai';

interface CheckResult {
  status: 'ok' | 'error';
  latency_ms: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await dbQuery('SELECT 1');
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency_ms: Date.now() - start, error: (error as Error).message };
  }
}

async function checkAI(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const provider = await getProvider();
    const health = await provider.checkHealth();
    return {
      status: health.ok ? 'ok' : 'error',
      latency_ms: Date.now() - start,
      error: health.ok ? undefined : health.details,
    };
  } catch (error) {
    return { status: 'error', latency_ms: Date.now() - start, error: (error as Error).message };
  }
}

export async function GET() {
  const [db, ai] = await Promise.all([checkDatabase(), checkAI()]);

  const allOk = db.status === 'ok' && ai.status === 'ok';

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { database: db, ai_provider: ai },
    },
    { status: allOk ? 200 : 503 }
  );
}
