import path from 'path';
import { runMigrations } from '@/lib/migrate';

const migrationsDir = path.resolve(__dirname, '..', 'migrations');

async function main() {
  console.log('[migrate] Running pending migrations...');
  const applied = await runMigrations(migrationsDir);
  if (applied.length === 0) {
    console.log('[migrate] No pending migrations.');
  } else {
    console.log(`[migrate] Applied ${applied.length} migration(s).`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
