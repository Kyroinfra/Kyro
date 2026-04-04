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
    storage_limit BIGINT DEFAULT 1073741824,
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

  // Phase 2: API Keys
  `CREATE TABLE IF NOT EXISTS api_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id),
    name          VARCHAR(255) NOT NULL,
    key_hash      TEXT UNIQUE NOT NULL,
    key_prefix    VARCHAR(20) NOT NULL,
    scopes        TEXT[] DEFAULT '{"read"}',
    last_used_at  TIMESTAMP,
    revoked_at    TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
  )`,

  // Phase 2: Files
  `CREATE TABLE IF NOT EXISTS files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    uploaded_by   UUID NOT NULL REFERENCES users(id),
    name          VARCHAR(500) NOT NULL,
    storage_key   TEXT NOT NULL,
    mime_type     VARCHAR(255),
    size_bytes    BIGINT NOT NULL,
    deleted_at    TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
  )`,

  // Phase 2: Usage Logs
  `CREATE TABLE IF NOT EXISTS usage_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(id),
    api_key_id      UUID REFERENCES api_keys(id),
    endpoint        VARCHAR(500),
    method          VARCHAR(10),
    status_code     INT,
    response_ms     INT,
    bytes_in        BIGINT DEFAULT 0,
    bytes_out       BIGINT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
  )`,

  // Phase 2: Usage Daily Rollup
  `CREATE TABLE IF NOT EXISTS usage_daily (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(id),
    date            DATE NOT NULL,
    total_requests  BIGINT DEFAULT 0,
    total_bytes_in  BIGINT DEFAULT 0,
    total_bytes_out BIGINT DEFAULT 0,
    storage_bytes   BIGINT DEFAULT 0,
    UNIQUE(org_id, date)
  )`,

  // Phase 2: Indexes
  `CREATE INDEX IF NOT EXISTS idx_files_org_id ON files(org_id) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_usage_logs_org_id ON usage_logs(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`,

  // Add storage_limit column if not exists
  `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 1073741824`,
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
