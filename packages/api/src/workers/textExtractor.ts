// workers/textExtractor.ts  (full replacement)
// ─────────────────────────────────────────────────────────────────────────────
// Changes vs. original:
//   • After successful text extraction, calls embedFile() to chunk + embed the
//     document and store vectors in file_chunks.
//   • Embedding failures are non-fatal: the job still succeeds, and the file's
//     embeddingStatus is set to 'failed' so operators can retry.
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, UnrecoverableError } from 'bullmq';
import { db } from '../db';
import { files, textExtractionJobs } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getFilePath } from '../lib/storage';
import { extractText } from '../lib/extractors';
import { embedFile } from '../lib/embeddings';
import { dispatchWebhookEvent } from '../lib/webhook';
import { getBullMQRedis, getRedis } from '../db/redis';
import fs from 'fs';

interface TextExtractionJobData {
  fileId: string;
  storageKey: string;
  mimeType: string;
  jobId: string;
  orgId: string;
}

// ── Startup recovery ──────────────────────────────────────────────────────────
// Reset jobs that were left as 'processing' from a previous worker crash.

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

async function processTextExtractionJob(job: { data: TextExtractionJobData }): Promise<void> {
  const { fileId, storageKey, mimeType, jobId, orgId } = job.data;

  // Guard: file must exist on disk
  const filePath = getFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    throw new UnrecoverableError(`File not found at path: ${filePath}`);
  }

  // Mark job as processing
  await db.update(textExtractionJobs)
    .set({
      status: 'processing',
      startedAt: new Date(),
      attempts: db.$count(textExtractionJobs, eq(textExtractionJobs.id, jobId)),
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
  // Non-fatal: if OPENAI_API_KEY is missing or the call fails, we log and
  // continue. The file's embeddingStatus will be left as 'pending' or 'failed'
  // and can be retried via POST /v2/files/:id/embed.

  if (!process.env.OLLAMA_URL && process.env.NODE_ENV === 'production') {
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
    // Don't fail the whole job — text extraction succeeded.
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
    const isFinal = job.attemptsMade >= maxAttempts;

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
