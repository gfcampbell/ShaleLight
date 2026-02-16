import cron from 'node-cron';
import { randomUUID } from 'crypto';
import { dbQuery } from '@/lib/db';
import { runCrawlJob } from '@/lib/jobs/crawl';
import { runIngestJob } from '@/lib/jobs/ingest';
import { runEmbedJob } from '@/lib/jobs/embed';
import { runEntityExtractJob } from '@/lib/jobs/entityExtract';
import { runEntityCleanupJob } from '@/lib/jobs/entityCleanup';
import { runIndexRebuildJob } from '@/lib/jobs/indexRebuild';
import { runPipelineJob } from '@/lib/jobs/pipeline';
import { purgeExpiredCache } from '@/lib/cache';

const runners: Record<string, (jobId: string, metadata: Record<string, unknown>) => Promise<void>> = {
  crawl: runCrawlJob,
  ingest: runIngestJob,
  embed: runEmbedJob,
  entity_extract: runEntityExtractJob,
  entity_cleanup: runEntityCleanupJob,
  index_rebuild: runIndexRebuildJob,
  pipeline: runPipelineJob,
};

const runningTypes = new Set<string>();
const cancelledJobs = new Set<string>();

/** Check if a job has been cancelled. Job loops should call this periodically. */
export function isJobCancelled(jobId: string): boolean {
  return cancelledJobs.has(jobId);
}

/** Signal a running job to stop. Returns true if the job was running. */
export function cancelJob(jobId: string): void {
  cancelledJobs.add(jobId);
}

export async function enqueueJob(type: string, metadata: Record<string, unknown>, createdBy: string | null) {
  const id = randomUUID();
  await dbQuery(
    `INSERT INTO jobs (id, type, status, progress, metadata, created_by)
     VALUES ($1, $2, 'pending', 0, $3::jsonb, $4)`,
    [id, type, JSON.stringify(metadata), createdBy]
  );

  if (runningTypes.has(type)) {
    await dbQuery(`UPDATE jobs SET status = 'skipped', completed_at = NOW() WHERE id = $1`, [id]);
    return id;
  }

  const run = runners[type];
  if (!run) {
    await dbQuery(`UPDATE jobs SET status = 'failed', error_message = 'Unknown job type' WHERE id = $1`, [id]);
    return id;
  }

  // Acquire lock synchronously BEFORE queueMicrotask to prevent race condition
  // where two concurrent enqueueJob calls both pass the has() check above
  runningTypes.add(type);

  queueMicrotask(async () => {
    try {
      await dbQuery(`UPDATE jobs SET status = 'running', started_at = NOW() WHERE id = $1`, [id]);
      await run(id, metadata);
      await dbQuery(`UPDATE jobs SET status = 'completed', progress = 100, completed_at = NOW() WHERE id = $1`, [id]);
    } catch (error) {
      await dbQuery(`UPDATE jobs SET status = 'failed', error_message = $2, completed_at = NOW() WHERE id = $1`, [
        id,
        (error as Error).message,
      ]);
    } finally {
      runningTypes.delete(type);
      cancelledJobs.delete(id);
    }
  });
  return id;
}

let scheduled = false;
export function startScheduler() {
  if (scheduled) return;
  scheduled = true;
  cron.schedule('0 2 * * *', () => void enqueueJob('entity_extract', {}, null));
  cron.schedule('0 3 * * *', () => void enqueueJob('entity_cleanup', {}, null));
  cron.schedule('0 4 * * *', () => void enqueueJob('index_rebuild', {}, null));
  // Session cleanup - daily at 1 AM
  cron.schedule('0 1 * * *', () => {
    dbQuery(`DELETE FROM sessions WHERE expires_at < NOW()`).catch(() => undefined);
  });
  // Cache purge - daily at 3:30 AM
  cron.schedule('30 3 * * *', () => {
    purgeExpiredCache().catch(() => undefined);
  });
}
