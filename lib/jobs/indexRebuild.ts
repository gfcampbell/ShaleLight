import { dbQuery } from '@/lib/db';

export async function runIndexRebuildJob(jobId: string): Promise<void> {
  await dbQuery(`DROP INDEX IF EXISTS chunks_embedding_idx`);
  await dbQuery(`CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops)`);
  await dbQuery(`REINDEX INDEX chunks_fts_idx`);
  await dbQuery(`REINDEX INDEX chunks_content_trgm_idx`);
  await dbQuery(`UPDATE jobs SET processed_items = 1, total_items = 1, progress = 100 WHERE id = $1`, [jobId]);
}
