import { dbQuery } from '@/lib/db';
import { runCrawlJob } from './crawl';
import { runIngestJob } from './ingest';
import { runEmbedJob } from './embed';
import { isJobCancelled } from './scheduler';
import { randomUUID } from 'crypto';

/**
 * Pipeline job: Runs crawl → ingest → embed in sequence for a source.
 * Creates sub-jobs for tracking but executes them directly.
 */
export async function runPipelineJob(jobId: string, metadata: Record<string, unknown>): Promise<void> {
  const sourceId = String(metadata.source_id || '');
  if (!sourceId) throw new Error('source_id is required for pipeline jobs');

  let processed = 0;
  const stages = ['crawl', 'ingest', 'embed'];
  
  for (const stage of stages) {
    if (isJobCancelled(jobId)) {
      throw new Error('Pipeline cancelled');
    }

    // Create sub-job for tracking
    const subJobId = randomUUID();
    await dbQuery(
      `INSERT INTO jobs (id, type, status, metadata, created_by)
       VALUES ($1, $2, 'running', $3::jsonb, NULL)`,
      [subJobId, stage, JSON.stringify({ source_id: sourceId, parent_job_id: jobId })]
    );

    try {
      await dbQuery(`UPDATE jobs SET started_at = NOW() WHERE id = $1`, [subJobId]);
      
      // Run the stage
      if (stage === 'crawl') {
        await runCrawlJob(subJobId, { source_id: sourceId });
      } else if (stage === 'ingest') {
        await runIngestJob(subJobId, { source_id: sourceId });
      } else if (stage === 'embed') {
        await runEmbedJob(subJobId, { source_id: sourceId });
      }
      
      await dbQuery(
        `UPDATE jobs SET status = 'completed', progress = 100, completed_at = NOW() WHERE id = $1`,
        [subJobId]
      );
    } catch (error) {
      await dbQuery(
        `UPDATE jobs SET status = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1`,
        [subJobId, (error as Error).message]
      );
      throw error; // Fail the pipeline if any stage fails
    }

    processed++;
    const progress = Math.floor((processed / stages.length) * 100);
    await dbQuery(`UPDATE jobs SET progress = $2, processed_items = $3 WHERE id = $1`, [
      jobId,
      progress,
      processed,
    ]);
  }

  await dbQuery(`UPDATE jobs SET total_items = $2 WHERE id = $1`, [jobId, stages.length]);
}
