import fs from 'fs';
import path from 'path';
import { dbQuery, withTransaction, clientQuery } from '@/lib/db';
import logger from '@/lib/logger';

export async function ensureMigrationsTable(): Promise<void> {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await dbQuery<{ name: string }>(`SELECT name FROM _migrations ORDER BY name`);
  return new Set(rows.map((r) => r.name));
}

export async function getPendingMigrations(migrationsDir: string): Promise<string[]> {
  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.filter((f) => !applied.has(f));
}

export async function runMigrations(migrationsDir: string): Promise<string[]> {
  await ensureMigrationsTable();
  const pending = await getPendingMigrations(migrationsDir);

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await clientQuery(client, `INSERT INTO _migrations (name) VALUES ($1)`, [file]);
    });
    logger.info(`[migrate] Applied: ${file}`);
  }

  return pending;
}
