/**
 * In-process ingest pipeline: extract → embed, for one file.
 *
 * Replaces the old Redis/BullMQ text-extraction worker (RFC #49 decision —
 * drop Redis). Files are processed through a semaphore so parallel uploads
 * never multiply extraction's RAM/CPU cost, and failures land in the DB
 * instead of vanishing into a fire-and-forget queue:
 *
 *   - extraction error → text_extraction_jobs.status = failed + extraction.failed webhook
 *   - embed error      → files.embedding_status = failed (extraction stays completed)
 *   - RAG disabled     → files.embedding_status = skipped, no HTTP happens
 *
 * There are no automatic retries anymore (they were BullMQ's attempts/backoff).
 * Callers re-trigger via POST /files/:id/extract. On process restart,
 * recoverInterruptedPipelines() marks jobs lost mid-run as failed — nothing
 * is left dangling in 'processing'.
 */
import fs from 'node:fs';
import { db } from '../db';
import { files, textExtractionJobs } from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import config from '../config';
import { getFilePath } from './storage';
import { extractText } from './extractors';
import { embedFile } from '../rag/ingest';
import { dispatchWebhookEvent } from './webhook';
import { Semaphore } from './semaphore';

export interface PipelineInput {
  fileId:     string;
  storageKey: string;
  mimeType:   string;
  jobId:      string;
  orgId:      string;
}

const ingestSlots = new Semaphore(2);

/** Fire-and-forget; every failure is recorded in the DB, never thrown. */
export function runPipeline(input: PipelineInput): void {
  void ingestSlots
    .run(() => processPipeline(input))
    .catch((err) => console.error(`Pipeline: unhandled failure for file ${input.fileId}:`, err));
}

async function processPipeline({ fileId, storageKey, mimeType, jobId, orgId }: PipelineInput): Promise<void> {
  const filePath = getFilePath(storageKey);

  if (!fs.existsSync(filePath)) {
    await failJob(jobId, orgId, fileId, `File not found at path: ${filePath}`);
    return;
  }

  await db.update(textExtractionJobs)
    .set({
      status:    'processing',
      startedAt: new Date(),
      attempts:  sql`${textExtractionJobs.attempts} + 1`,
    })
    .where(eq(textExtractionJobs.id, jobId));

  await dispatchWebhookEvent(orgId, 'extraction.started', { fileId, jobId });

  // ── Step 1: Extract text ───────────────────────────────────────────────────
  let extractedText: string;
  try {
    extractedText = await extractText(mimeType, filePath);
  } catch (err) {
    console.error(`Pipeline: extraction failed for file ${fileId}:`, err);
    await failJob(jobId, orgId, fileId, err instanceof Error ? err.message : String(err));
    return;
  }

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

  console.log(`Pipeline: text extraction completed for file ${fileId} (${extractedText.length} chars)`);

  // ── Step 2: Embed chunks ───────────────────────────────────────────────────
  if (!config.ragEnabled) {
    console.warn(`Pipeline: RAG disabled (OLLAMA_URL not set) — skipping embedding for file ${fileId}`);
    await db.update(files)
      .set({ embeddingStatus: 'skipped' })
      .where(eq(files.id, fileId));
    return;
  }

  try {
    const result = await embedFile({ fileId, orgId, extractedText });
    if (result.skipped) {
      console.log(`Pipeline: embedding skipped for file ${fileId} (no text)`);
    } else {
      console.log(`Pipeline: embedded ${result.chunksCreated} chunks for file ${fileId}`);
    }
  } catch (embedErr) {
    console.error(`Pipeline: embedding failed for file ${fileId}:`, embedErr);
    await db.update(files)
      .set({ embeddingStatus: 'failed' })
      .where(eq(files.id, fileId));
  }
}

async function failJob(jobId: string, orgId: string, fileId: string, message: string): Promise<void> {
  await db.update(textExtractionJobs)
    .set({ status: 'failed', error: message, completedAt: new Date() })
    .where(eq(textExtractionJobs.id, jobId));
  await dispatchWebhookEvent(orgId, 'extraction.failed', { fileId, jobId, error: message });
}

/**
 * Called once at API start: jobs that were pending/processing when the
 * previous process died are marked failed so no file looks like it is
 * "in progress" forever. Re-run extraction on the ones you care about.
 */
export async function recoverInterruptedPipelines(): Promise<void> {
  try {
    const rows = await db
      .update(textExtractionJobs)
      .set({
        status:      'failed',
        error:       'Interrupted by restart',
        completedAt: new Date(),
      })
      .where(inArray(textExtractionJobs.status, ['pending', 'processing']))
      .returning({ id: textExtractionJobs.id });

    if (rows.length > 0) {
      console.log(`Pipeline: marked ${rows.length} interrupted job(s) as failed`);
    }
  } catch (err) {
    console.error('Pipeline: recovery sweep failed:', err);
  }
}
