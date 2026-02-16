import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/roles';
import { dbQuery } from '@/lib/db';
import { auditLog } from '@/lib/audit';

const ALLOWED_KEYS = new Set([
  'ai_provider',
  'ollama_url',
  'ollama_llm_model',
  'ollama_embedding_model',
  'openai_api_key',
  'openai_llm_model',
  'openai_embedding_model',
  'anthropic_api_key',
  'anthropic_llm_model',
  'embedding_dimensions',
  'system_prompt',
  'default_crawl_schedule',
  'default_file_types',
  'min_vector_similarity',
  'max_chat_history',
  'chunk_target_tokens',
  'chunk_overlap_tokens',
]);

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const settings = await dbQuery<{ key: string; value: unknown }>(
    `SELECT key, value FROM settings ORDER BY key`
  );
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = (await request.json()) as { key: string; value: unknown };

  if (!ALLOWED_KEYS.has(body.key)) {
    return NextResponse.json({ error: `Unknown setting key: ${body.key}` }, { status: 400 });
  }

  await dbQuery(
    `INSERT INTO settings (key, value, updated_at, updated_by)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [body.key, JSON.stringify(body.value), auth.userId || null]
  );
  auditLog(auth.userId || null, 'settings_update', 'settings', { key: body.key });
  return NextResponse.json({ ok: true });
}
