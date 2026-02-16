import { dbQuery } from '@/lib/db';
import { getProvider } from '@/lib/ai';
import logger from '@/lib/logger';
import { isJobCancelled } from '@/lib/jobs/scheduler';

export async function runEntityExtractJob(jobId: string): Promise<void> {
  const provider = await getProvider();
  const chunks = await dbQuery<{ id: string; content: string }>(
    `SELECT id, content FROM chunks WHERE entities_extracted = FALSE ORDER BY created_at ASC LIMIT 500`
  );
  let processed = 0;
  for (const chunk of chunks) {
    if (isJobCancelled(jobId)) break;
    try {
      const prompt = `Extract named entities from this text. Return JSON:
{"entities":[{"name":"...","type":"person","variants":["..."]}]}

Text:
${chunk.content.slice(0, 5000)}`;
      const parsed = (await provider.generateJSON(prompt)) as {
        entities?: Array<{ name: string; type: string; variants?: string[] }>;
      };
      for (const entity of parsed.entities || []) {
        const id = entity.name.toLowerCase();
        await dbQuery(
          `INSERT INTO entities (id, canonical, type, variants, frequency)
           VALUES ($1,$2,$3,$4,1)
           ON CONFLICT (id) DO UPDATE
           SET frequency = entities.frequency + 1`,
          [id, entity.name, entity.type || 'term', entity.variants || []]
        );
      }
      await dbQuery(`UPDATE chunks SET entities_extracted = TRUE WHERE id = $1`, [chunk.id]);
      processed += 1;
      await dbQuery(`UPDATE jobs SET processed_items = $2 WHERE id = $1`, [jobId, processed]);
    } catch (error) {
      logger.error({ chunkId: chunk.id, err: (error as Error).message }, 'Failed to extract entities from chunk');
    }
  }
  await dbQuery(`UPDATE jobs SET total_items = $2, progress = 100 WHERE id = $1`, [jobId, processed]);
}
