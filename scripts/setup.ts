import { execSync } from 'child_process';
import { dbQuery } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

function checkCommand(command: string, name: string) {
  try {
    execSync(command, { stdio: 'ignore' });
    logger.info(`[setup] ${name}: ok`);
  } catch {
    throw new Error(`${name} is not installed or not running`);
  }
}

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'change-this-too';
  const users = await dbQuery<{ id: string }>(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [username]);
  if (users[0]) {
    logger.info('[setup] admin user already exists');
    return;
  }
  const passwordHash = await hashPassword(password);
  await dbQuery(
    `INSERT INTO users (id, username, password_hash, role, is_active)
     VALUES ($1,$2,$3,'admin',TRUE)`,
    [randomUUID(), username, passwordHash]
  );
  logger.info(`[setup] created admin user "${username}"`);
}

async function main() {
  checkCommand('docker --version', 'Docker');
  checkCommand('ollama --version', 'Ollama');
  checkCommand('node --version', 'Node');
  await dbQuery('SELECT 1');
  logger.info('[setup] database connection ok');
  await ensureAdmin();
}

main().catch((err) => {
  logger.error('[setup] failed:', err.message);
  process.exit(1);
});
