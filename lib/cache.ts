import crypto from 'crypto';
import { dbQuery } from '@/lib/db';

export interface CachedResponse {
  answer: string;
  citations: unknown[];
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function cacheKey(query: string): string {
  return crypto.createHash('sha256').update(normalizeQuery(query)).digest('hex');
}

export async function getCachedResponse(query: string): Promise<CachedResponse | null> {
  const key = cacheKey(query);
  const rows = await dbQuery<{ answer: string; citations: unknown[] }>(
    `SELECT answer, citations
     FROM response_cache
     WHERE cache_key = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [key]
  );
  if (!rows[0]) return null;
  await dbQuery(`SELECT increment_cache_hit($1)`, [key]).catch(() => undefined);
  return rows[0];
}

export async function setCachedResponse(
  query: string,
  answer: string,
  citations: unknown[]
): Promise<void> {
  const key = cacheKey(query);
  await dbQuery(
    `INSERT INTO response_cache (cache_key, query, answer, citations, hit_count, created_at, last_accessed_at)
     VALUES ($1, $2, $3, $4::jsonb, 0, NOW(), NOW())
     ON CONFLICT (cache_key) DO UPDATE
     SET answer = EXCLUDED.answer,
         citations = EXCLUDED.citations,
         last_accessed_at = NOW()`,
    [key, query, answer, JSON.stringify(citations)]
  );
}

export async function purgeExpiredCache(): Promise<number> {
  const rows = await dbQuery<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM response_cache WHERE created_at < NOW() - INTERVAL '7 days' RETURNING 1
     ) SELECT count(*)::text AS count FROM deleted`
  );
  return parseInt(rows[0]?.count || '0', 10);
}
