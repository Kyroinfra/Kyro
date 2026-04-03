import pool from './index';

const migrations = [
  `CREATE TABLE IF NOT EXISTS _migrations (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,
    run_at    TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS organisations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    plan        VARCHAR(50) DEFAULT 'free',
    created_at  TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(50) DEFAULT 'member',
    created_at      TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
];

export async function runMigrations(): Promise<void> {
  console.log('Running migrations...');

  for (const sql of migrations) {
    await pool.query(sql);
  }

  console.log('Migrations completed successfully');
}

export async function hasMigrations(): Promise<boolean> {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'organisations'
    ) as exists
  `);
  return result.rows[0]?.exists === true;
}
