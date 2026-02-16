import { dbQuery } from '@/lib/db';

export async function runEntityCleanupJob(jobId: string): Promise<void> {
  await dbQuery(
    `DELETE FROM entities e
     WHERE e.frequency = 1
       AND NOT EXISTS (
         SELECT 1 FROM entity_edges edge
         WHERE edge.source_entity = e.id OR edge.target_entity = e.id
       )`
  );
  await dbQuery(`UPDATE jobs SET processed_items = 1, total_items = 1, progress = 100 WHERE id = $1`, [jobId]);
}
