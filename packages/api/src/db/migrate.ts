// db/migrate.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
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

// Add this — without it, `node dist/db/migrate.js` does nothing
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
