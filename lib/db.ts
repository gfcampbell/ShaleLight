import { Pool, PoolClient } from 'pg';
import { validateEnv } from '@/lib/env';

let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    validateEnv();
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function dbQuery<T = unknown>(text: string, values: unknown[] = []): Promise<T[]> {
  const db = getDb();
  const result = await db.query(text, values);
  return result.rows as T[];
}

export async function clientQuery<T = unknown>(
  client: PoolClient,
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await client.query(text, values);
  return result.rows as T[];
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
