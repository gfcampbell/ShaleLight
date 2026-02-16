import { dbQuery } from '@/lib/db';
import { getEmbeddingProvider } from '@/lib/ai';
import { isJobCancelled } from '@/lib/jobs/scheduler';

async function checkEmbeddingDimensions(expectedDimensions: number): Promise<void> {
  const rows = await dbQuery<{ atttypmod: number }>(
    `SELECT a.atttypmod
     FROM pg_attribute a
     JOIN pg_class c ON a.attrelid = c.oid
     WHERE c.relname = 'chunks' AND a.attname = 'embedding' AND a.atttypmod > 0`
  );
  if (rows[0]) {
    const columnDim = rows[0].atttypmod;
    if (columnDim !== expectedDimensions) {
      throw new Error(
        `Embedding dimension mismatch: provider outputs ${expectedDimensions}d vectors, ` +
        `but chunks.embedding column is ${columnDim}d. ` +
        `Run: ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(${expectedDimensions});`
      );
    }
  }
}

export async function runEmbedJob(jobId: string): Promise<void> {
  const provider = await getEmbeddingProvider();
  const expectedDim = provider.getEmbeddingDimensions();
  await checkEmbeddingDimensions(expectedDim);

  const chunks = await dbQuery<{ id: string; content: string }>(
    `SELECT id, content FROM chunks WHERE embedding IS NULL ORDER BY created_at ASC LIMIT 2000`
  );
  let processed = 0;
  for (const chunk of chunks) {
    if (isJobCancelled(jobId)) break;
    try {
      const embedding = await provider.embedText(chunk.content);
      await dbQuery(`UPDATE chunks SET embedding = $2::vector WHERE id = $1`, [chunk.id, `[${embedding.join(',')}]`]);
      processed += 1;
      await dbQuery(`UPDATE jobs SET processed_items = $2 WHERE id = $1`, [jobId, processed]);
    } catch {
      // Keep processing other chunks.
    }
  }
  await dbQuery(`UPDATE jobs SET total_items = $2, progress = 100 WHERE id = $1`, [jobId, processed]);
}
