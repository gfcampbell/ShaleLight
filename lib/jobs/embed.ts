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
  console.log(`[embed] Starting embed job ${jobId}`);
  const provider = await getEmbeddingProvider();
  const expectedDim = provider.getEmbeddingDimensions();
  await checkEmbeddingDimensions(expectedDim);

  const chunks = await dbQuery<{ id: string; content: string }>(
    `SELECT id, content FROM chunks WHERE embedding IS NULL ORDER BY created_at ASC LIMIT 2000`
  );
  console.log(`[embed] Found ${chunks.length} chunks without embeddings`);
  
  let processed = 0;
  let errors = 0;
  for (const chunk of chunks) {
    if (isJobCancelled(jobId)) break;
    try {
      const embedding = await provider.embedText(chunk.content);
      await dbQuery(`UPDATE chunks SET embedding = $2::vector WHERE id = $1`, [chunk.id, `[${embedding.join(',')}]`]);
      processed += 1;
      if (processed % 50 === 0) {
        console.log(`[embed] Progress: ${processed}/${chunks.length}`);
      }
      await dbQuery(`UPDATE jobs SET processed_items = $2 WHERE id = $1`, [jobId, processed]);
    } catch (err) {
      errors += 1;
      console.error(`[embed] Error embedding chunk ${chunk.id}:`, err.message);
    }
  }
  console.log(`[embed] Completed: ${processed} successful, ${errors} errors`);
  await dbQuery(`UPDATE jobs SET total_items = $2, progress = 100 WHERE id = $1`, [jobId, processed]);
}
