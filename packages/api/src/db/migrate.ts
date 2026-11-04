// db/migrate.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import config from '../config';

export async function runMigrations() {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 1,
  });

  const db = drizzle(pool);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations completed successfully');
  await pool.end();
}

/**
 * Stable advisory-lock key. Every runner that executes migrations takes this
 * session-scoped lock first, so concurrent starts (replica scale-up, a compose
 * up racing a restart) queue instead of racing on the schema (#46). pg_advisory
 * locks release automatically when the owning session disconnects, so a
 * crashed holder cannot poison the next boot.
 */
const MIGRATION_LOCK_KEY = 702345197832;

export async function runMigrationsUnderLock() {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    // Blocking by design: runners wait their turn; the drizzle journal makes
    // each run idempotent, so waiting runners then no-op quickly.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await runMigrations();
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
      .catch(() => {
        // Session is dying anyway — postgres releases session locks then.
      });
    await client.end().catch(() => {});
  }
}

// Direct CLI entry — without it, `node dist/db/migrate.js` does nothing.
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
