import fs from 'fs/promises';
import path from 'path';
import { dbQuery } from '@/lib/db';
import { getFileMetadata } from '@/lib/fileDiscovery';
import { randomUUID } from 'crypto';
import { isJobCancelled } from '@/lib/jobs/scheduler';

async function walkDir(
  dir: string,
  allowed: Set<string>,
  excludePatterns: string[],
  maxDepth: number,
  currentDepth = 0
): Promise<string[]> {
  if (currentDepth > maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludePatterns.some((p) => entry.name === p || entry.name.match(p))) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase().replace(/\./g, '');
      if (allowed.has(`.${ext}`)) {
        files.push(fullPath);
      }
    } else if (entry.isDirectory()) {
      const subFiles = await walkDir(fullPath, allowed, excludePatterns, maxDepth, currentDepth + 1);
      files.push(...subFiles);
    }
  }

  return files;
}

export async function runCrawlJob(jobId: string, metadata: Record<string, unknown>): Promise<void> {
  const sourceId = String(metadata.source_id || '');
  if (!sourceId) throw new Error('source_id is required for crawl jobs');
  const [source] = await dbQuery<{
    id: string;
    path: string;
    file_types: string[];
    recursive: boolean;
    max_depth: number;
    exclude_patterns: string[];
  }>(
    `SELECT id, path, file_types, recursive, max_depth, exclude_patterns FROM crawl_sources WHERE id = $1`,
    [sourceId]
  );
  if (!source) throw new Error('source not found');

  const allowed = new Set((source.file_types || ['pdf', 'xlsx', 'csv', 'docx']).map((t) => `.${t.toLowerCase()}`));
  const excludePatterns = source.exclude_patterns || ['node_modules', '.git', '.DS_Store'];
  let discovered = 0;

  let filePaths: string[];
  if (source.recursive) {
    filePaths = await walkDir(source.path, allowed, excludePatterns, source.max_depth || 10);
  } else {
    const entries = await fs.readdir(source.path, { withFileTypes: true });
    filePaths = entries
      .filter((e) => e.isFile())
      .map((e) => path.join(source.path, e.name))
      .filter((fp) => {
        const ext = path.extname(fp).toLowerCase().replace(/\./g, '');
        return allowed.has(`.${ext}`);
      });
  }

  for (const filePath of filePaths) {
    if (isJobCancelled(jobId)) break;
    const m = await getFileMetadata(filePath);
    await dbQuery(
      `INSERT INTO file_index
       (id, source_id, file_path, file_name, file_type, file_size, file_hash, file_modified, file_created, status, discovered_at, last_checked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'discovered',NOW(),NOW())
       ON CONFLICT (file_path) DO UPDATE
       SET file_hash = EXCLUDED.file_hash,
           file_size = EXCLUDED.file_size,
           file_modified = EXCLUDED.file_modified,
           last_checked_at = NOW(),
           status = CASE WHEN file_index.file_hash <> EXCLUDED.file_hash THEN 'discovered' ELSE file_index.status END`,
      [randomUUID(), source.id, m.path, m.name, path.extname(m.name).replace('.', ''), m.size, m.hash, m.mtime, m.birthtime]
    );
    discovered += 1;
  }

  await dbQuery(`UPDATE jobs SET processed_items = $2, total_items = $2, progress = 100 WHERE id = $1`, [jobId, discovered]);
}
