/**
 * Single source of runtime configuration.
 *
 * Every environment variable the API uses is read, validated and typed here
 * and nowhere else — no other module may touch process.env. The config is
 * parsed at module load: an invalid or missing required variable throws
 * immediately, so every entry point (API, workers, migrate, jest) fails fast
 * with a readable error instead of misbehaving later.
 */
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/** "false"/"0"/"" → false; anything else → true (explicit, unlike coerce). */
const booleanish = z
  .string()
  .optional()
  .transform((v) => v !== undefined && v !== '' && v !== 'false' && v !== '0');

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),

  /** Optional — rate limiting / queues degrade gracefully without it for now. */
  REDIS_URL: z
    .string()
    .optional()
    .transform((v) => v ?? ''),

  /** Storage root for uploaded files. */
  UPLOAD_DIR: z
    .string()
    .optional()
    .transform((v) => v ?? path.resolve(process.cwd(), 'uploads')),

  /**
   * Ollama base URL. Empty/unset means the RAG pipeline is disabled:
   * uploads skip embedding, /search falls back to full-text only, /ask is 503.
   */
  OLLAMA_URL: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, '') : '')),

  EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  /** Vector dimension — must match the model and the pgvector column. */
  EMBEDDING_DIM: z.coerce.number().int().positive().default(768),
  CHAT_MODEL: z.string().default('llama3.2'),
  RERANK_MODEL: z.string().default('llama3.2'),
  /** Opt-in: cross-encoder rerank adds serial LLM calls per query. */
  RERANK_ENABLED: booleanish,
  /** Max cosine distance for a chunk to enter the vector arm of RRF. */
  VECTOR_DISTANCE_THRESHOLD: z.coerce.number().gte(0).default(0.5),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(
    `Invalid configuration — fix the following environment variables:\n${details}`
  );
}

const env = parsed.data;

const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  redisUrl: env.REDIS_URL,
  uploadDir: env.UPLOAD_DIR,
  ollamaUrl: env.OLLAMA_URL,
  embeddingModel: env.EMBEDDING_MODEL,
  embeddingDim: env.EMBEDDING_DIM,
  chatModel: env.CHAT_MODEL,
  rerankModel: env.RERANK_MODEL,
  rerankEnabled: env.RERANK_ENABLED,
  vectorDistanceThreshold: env.VECTOR_DISTANCE_THRESHOLD,

  /** Derived: RAG features (embedding, semantic search, ask) are active. */
  ragEnabled: env.OLLAMA_URL !== '',
};

export default config;
