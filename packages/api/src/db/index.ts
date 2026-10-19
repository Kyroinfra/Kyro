import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import config from '../config';
import * as schema from './schema';

/**
 * The one raw pg connection handle in the codebase.
 *
 * Per the Drizzle-everywhere rule (#26), ONLY the hybrid retrieval module
 * (lib/retrieval.ts — the tsvector/vector-specific query) may import this.
 * Everyone else goes through the typed `db` below.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
