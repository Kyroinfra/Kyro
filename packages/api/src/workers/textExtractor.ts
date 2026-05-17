// workers/textExtractor.ts  (FIXED)
// ─────────────────────────────────────────────────────────────────────────────
// Fixes applied:
//   1. OLLAMA_URL guard was inverted — it only skipped embedding in production
//      without the URL. Fixed to skip whenever OLLAMA_URL is not set regardless
//      of NODE_ENV, so dev environments don't silently fail trying to hit a
//      non-existent Ollama server.
//   2. attempts update uses a plain increment instead of db.$count() which
//      was doing a COUNT(*) subquery instead of incrementing the column.
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, UnrecoverableError } from 'bullmq';
import { db } from '../db';
import { files, textExtractionJobs } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { getFilePath } from '../lib/storage';
import { extractText } from '../lib/extractors';
import { embedFile } from '../lib/embeddings';
import { dispatchWebhookEvent } from '../lib/webhook';
import { getBullMQRedis, getRedis } from '../db/redis';
import fs from 'fs';

interface TextExtractionJobData {
  fileId:     string;
  storageKey: string;
  mimeType:   string;
  jobId:      string;
  orgId:      string;
}

// ── Startup recovery ──────────────────────────────────────────────────────────

async function recoverStuckJobs(): Promise<void> {
  try {
    const stuck = await db
      .update(textExtractionJobs)
      .set({ status: 'pending', startedAt: null })
      .where(inArray(textExtractionJobs.status, ['processing']))
      .returning({ id: textExtractionJobs.id });

    if (stuck.length > 0) {
      console.log(`Worker: Reset ${stuck.length} stuck 'processing' job(s) to 'pending'`);
    }
  } catch (err) {
    console.error('Worker: Failed to recover stuck jobs:', err);
  }
}

// ── Job processor ─────────────────────────────────────────────────────────────

async function processTextExtractionJob(job: { data: TextExtractionJobData; attemptsMade: number }): Promise<void> {
  const { fileId, storageKey, mimeType, jobId, orgId } = job.data;

  const filePath = getFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    throw new UnrecoverableError(`File not found at path: ${filePath}`);
  }

  // Mark as processing — use sql`` increment, not db.$count() which is a COUNT subquery
  await db.update(textExtractionJobs)
    .set({
      status:    'processing',
      startedAt: new Date(),
      attempts:  sql`${textExtractionJobs.attempts} + 1`,
    })
    .where(eq(textExtractionJobs.id, jobId));

  await dispatchWebhookEvent(orgId, 'extraction.started', { fileId, jobId });

  // ── Step 1: Extract text ───────────────────────────────────────────────────
  const extractedText = await extractText(mimeType, filePath);

  await db.transaction(async (tx) => {
    await tx.update(files)
      .set({ extractedText })
      .where(eq(files.id, fileId));

    await tx.update(textExtractionJobs)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(textExtractionJobs.id, jobId));
  });

  await dispatchWebhookEvent(orgId, 'extraction.completed', {
    fileId,
    jobId,
    extractedTextLength: extractedText.length,
  });

  console.log(`Worker: Text extraction completed for file ${fileId} (${extractedText.length} chars)`);

  // ── Step 2: Embed chunks ───────────────────────────────────────────────────
  // FIX: skip whenever OLLAMA_URL is not set — not just in production.
  // Previously `!process.env.OLLAMA_URL && process.env.NODE_ENV === 'production'`
  // meant dev without Ollama would still try to call http://localhost:11434
  // and silently fail, leaving embeddingStatus as 'failed'.
  if (!process.env.OLLAMA_URL) {
    console.warn(`Worker: OLLAMA_URL not set — skipping embedding for file ${fileId}`);
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));
    return;
  }

  try {
    const result = await embedFile({ fileId, orgId, extractedText });
    if (result.skipped) {
      console.log(`Worker: Embedding skipped for file ${fileId} (no text)`);
    } else {
      console.log(`Worker: Embedded ${result.chunksCreated} chunks for file ${fileId}`);
    }
  } catch (embedErr) {
    console.error(`Worker: Embedding failed for file ${fileId}:`, embedErr);
    await db.update(files)
      .set({ embeddingStatus: 'failed' })
      .where(eq(files.id, fileId));
  }
}

// ── Worker bootstrap ──────────────────────────────────────────────────────────

async function start() {
  getRedis();

  const redisConnection = getBullMQRedis();
  if (!redisConnection) {
    console.error('Worker: Redis not available, exiting');
    process.exit(1);
  }

  await recoverStuckJobs();

  const worker = new Worker<TextExtractionJobData>(
    'text-extraction',
    async (job) => { await processTextExtractionJob(job); },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  worker.on('completed', (job) => {
    console.log(`Worker: Job ${job.id} completed`);
  });

  worker.on('failed', async (job, error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 3;
    const isFinal     = job.attemptsMade >= maxAttempts;

    console.error(
      `Worker: Job ${job.id} attempt ${job.attemptsMade}/${maxAttempts} failed:`,
      error.message,
    );

    if (isFinal) {
      const { jobId, orgId, fileId } = job.data as TextExtractionJobData;
      try {
        await db.update(textExtractionJobs)
          .set({ status: 'failed', error: error.message, completedAt: new Date() })
          .where(eq(textExtractionJobs.id, jobId));

        await dispatchWebhookEvent(orgId, 'extraction.failed', {
          fileId,
          jobId,
          error: error.message,
        });
      } catch (dbErr) {
        console.error('Worker: Failed to mark job as failed in DB:', dbErr);
      }
    }
  });

  worker.on('error', (error) => {
    console.error('Worker: Worker error:', error);
  });

  console.log('Worker: Text extraction worker started (with embedding)');

  async function shutdown(signal: string) {
    console.log(`Worker: ${signal} received, shutting down`);
    await worker.close();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();
