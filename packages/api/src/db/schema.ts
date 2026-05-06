import { pgTable, uuid, varchar, text, timestamp, bigint, date, index, uniqueIndex, serial, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const migrations = pgTable('_migrations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  runAt: timestamp('run_at').defaultNow(),
});

export const organisations = pgTable('organisations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).default('free'),
  storageLimit: bigint('storage_limit', { mode: 'number' }).default(1073741824),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).default('member'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdIdx: index('idx_users_org_id').on(table.orgId),
  emailIdx: index('idx_users_email').on(table.email),
}));

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
  scopes: text('scopes').array().default(sql`ARRAY['read']::text[]`),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  keyHashIdx: index('idx_api_keys_hash').on(table.keyHash),
}));

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  name: varchar('name', { length: 500 }).notNull(),
  storageKey: text('storage_key').notNull(),
  mimeType: varchar('mime_type', { length: 255 }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  extractedText: text('extracted_text'),
  extractionJobId: uuid('extraction_job_id'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdIdx: index('idx_files_org_id').on(table.orgId).where(sql`${table.deletedAt} IS NULL`),
  extractionJobIdIdx: index('idx_files_extraction_job_id').on(table.extractionJobId),
}));

export const textExtractionJobs = pgTable('text_extraction_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  fileIdIdx: uniqueIndex('idx_text_jobs_file_id').on(table.fileId),
  statusIdx: index('idx_text_jobs_status').on(table.status),
}));

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id),
  endpoint: varchar('endpoint', { length: 500 }),
  method: varchar('method', { length: 10 }),
  statusCode: integer('status_code'),
  responseMs: integer('response_ms'),
  bytesIn: bigint('bytes_in', { mode: 'number' }).default(0),
  bytesOut: bigint('bytes_out', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdIdx: index('idx_usage_logs_org_id').on(table.orgId),
  createdAtIdx: index('idx_usage_logs_created').on(table.createdAt),
}));

export const usageDaily = pgTable('usage_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id),
  date: date('date').notNull(),
  totalRequests: bigint('total_requests', { mode: 'number' }).default(0),
  totalBytesIn: bigint('total_bytes_in', { mode: 'number' }).default(0),
  totalBytesOut: bigint('total_bytes_out', { mode: 'number' }).default(0),
  storageBytes: bigint('storage_bytes', { mode: 'number' }).default(0),
}, (table) => ({
  orgDateIdx: uniqueIndex('idx_usage_daily_org_date').on(table.orgId, table.date),
}));

export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret').notNull(),          // HMAC-SHA256 signing secret
  events: text('events').array().notNull(),  // e.g. ['extraction.completed','extraction.failed']
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdIdx: index('idx_webhooks_org_id').on(table.orgId),
}));

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  event: varchar('event', { length: 100 }).notNull(),
  payload: text('payload').notNull(),        // JSON string — stored for replay/debug
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  statusCode: integer('status_code'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  webhookIdIdx: index('idx_webhook_deliveries_webhook_id').on(table.webhookId),
  statusIdx: index('idx_webhook_deliveries_status').on(table.status),
}));
