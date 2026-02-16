import fs from 'fs/promises';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { dbQuery, withTransaction, clientQuery } from '@/lib/db';
import { parseFile } from '@/lib/parsers';
import { chunkText } from '@/lib/chunker';
import { isJobCancelled } from '@/lib/jobs/scheduler';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function runIngestJob(jobId: string): Promise<void> {
  const files = await dbQuery<{
    id: string;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_hash: string;
    source_id: string;
  }>(`SELECT * FROM file_index WHERE status IN ('discovered','queued') ORDER BY discovered_at ASC LIMIT 1000`);

  let processed = 0;
  for (const file of files) {
    if (isJobCancelled(jobId)) break;
    try {
      if (file.file_size && file.file_size > MAX_FILE_SIZE) {
        await dbQuery(`UPDATE file_index SET status='failed', error_message=$2 WHERE id=$1`, [
          file.id,
          `File too large (${Math.round(file.file_size / 1024 / 1024)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit)`,
        ]);
        continue;
      }

      await dbQuery(`UPDATE file_index SET status = 'ingesting' WHERE id = $1`, [file.id]);
      const buffer = await fs.readFile(file.file_path);
      const parsed = await parseFile(file.file_path, buffer);
      const sourceId = crypto.createHash('sha256').update(parsed.rawText).digest('hex');

      const existing = await dbQuery<{ id: string }>(`SELECT id FROM documents WHERE source_id = $1 LIMIT 1`, [sourceId]);
      let documentId = existing[0]?.id;

      if (!documentId) {
        documentId = randomUUID();
        const chunks = chunkText(parsed.rawText);
        const docId = documentId;

        await withTransaction(async (client) => {
          await clientQuery(
            client,
            `INSERT INTO documents
             (id, source_id, title, raw_text, file_name, file_path, file_type, file_size, file_hash, source_ref, metadata, source_type, ingested_at, last_crawled_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,'local',NOW(),NOW())`,
            [
              docId,
              sourceId,
              parsed.title,
              parsed.rawText,
              file.file_name,
              file.file_path,
              file.file_type,
              file.file_size,
              file.file_hash,
              file.source_id,
              JSON.stringify(parsed.metadata),
            ]
          );

          for (const chunk of chunks) {
            await clientQuery(
              client,
              `INSERT INTO chunks
               (id, document_id, chunk_index, content, chunk_type, metadata, start_char, end_char, entities_extracted)
               VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,FALSE)`,
              [
                randomUUID(),
                docId,
                chunk.chunk_index,
                chunk.content,
                chunk.chunk_type,
                JSON.stringify(chunk.metadata),
                chunk.start_char,
                chunk.end_char,
              ]
            );
          }
        });
      }

      await dbQuery(`UPDATE file_index SET status='ingested', document_id=$2 WHERE id=$1`, [file.id, documentId]);
      processed += 1;
      await dbQuery(`UPDATE jobs SET processed_items=$2 WHERE id=$1`, [jobId, processed]);
    } catch (error) {
      await dbQuery(`UPDATE file_index SET status='failed', error_message=$2 WHERE id=$1`, [file.id, (error as Error).message]);
    }
  }

  await dbQuery(`UPDATE jobs SET total_items=$2, progress=100 WHERE id=$1`, [jobId, processed]);

  // Invalidate response cache when new documents are ingested
  if (processed > 0) {
    await dbQuery(`DELETE FROM response_cache`).catch(() => undefined);
  }
}
