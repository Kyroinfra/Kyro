/**
 * In-process ingest pipeline: extract → embed, for one file.
 *
 * One pipeline with one status (#33): a file's whole ingest position lives in
 * files.status (pending | processing | ready | failed | skipped) and failures
 * land in files.error — there is no jobs table. Files run through a semaphore
 * so parallel uploads never multiply extraction's RAM/CPU cost:
 *
 *   - upload (extractable MIME) → status = 'pending', pipeline fires
 *   - attempt start             → status = 'processing'
 *   - extraction ok             → text persisted; embedding takes over
 *   - embed ok                  → status = 'ready'   (rag/ingest sets it)
 *   - embed side not needed     → status = 'skipped' (RAG disabled / no text)
 *   - any failure               → status = 'failed' + files.error + file.failed
 *                                 event (#40: extract fails here, embed
 *                                 failures are dispatched by rag/ingest)
 *
 * There are no automatic retries (they were BullMQ's attempts/backoff, and
 * Redis is gone since #49) — re-run via POST /files/:id/reprocess. On process
 * restart, recoverInterruptedPipelines() marks files lost mid-run as failed so
 * nothing looks like it is "in progress" forever.
 */
import fs from 'node:fs';
import { db } from '../db';
import { files } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import config from '../config';
import { getFilePath } from './storage';
import { extractText } from './extractors';
import { embedFile } from '../rag/ingest';
import { dispatchWebhookEvent } from '../webhooks/dispatch';
import { Semaphore } from './semaphore';

export interface PipelineInput {
  fileId:     string;
  storageKey: string;
  mimeType:   string;
  orgId:      string;
}

const ingestSlots = new Semaphore(2);

/** Fire-and-forget; every failure is recorded in the DB, never thrown. */
export function runPipeline(input: PipelineInput): void {
  void ingestSlots
    .run(() => processPipeline(input))
    .catch((err) => console.error(`Pipeline: unhandled failure for file ${input.fileId}:`, err));
}

async function processPipeline({ fileId, storageKey, mimeType, orgId }: PipelineInput): Promise<void> {
  // ── Attempt start ──────────────────────────────────────────────────────────
  await db.update(files)
    .set({ status: 'processing', error: null })
    .where(eq(files.id, fileId));

  const fail = async (message: string): Promise<void> => {
    await db.update(files)
      .set({ status: 'failed', error: message })
      .where(eq(files.id, fileId));
    await dispatchWebhookEvent(orgId, 'file.failed', { fileId, error: message, stage: 'extract' });
  };

  const filePath = getFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    await fail(`File not found at path: ${filePath}`);
    return;
  }

  // ── Step 1: Extract text ───────────────────────────────────────────────────
  let extractedText: string;
  try {
    extractedText = await extractText(mimeType, filePath);
  } catch (err) {
    console.error(`Pipeline: extraction failed for file ${fileId}:`, err);
    await fail(err instanceof Error ? err.message : String(err));
    return;
  }

  await db.update(files)
    .set({ extractedText })
    .where(eq(files.id, fileId));

  console.log(`Pipeline: text extraction completed for file ${fileId} (${extractedText.length} chars)`);

  // ── Step 2: Embed chunks ───────────────────────────────────────────────────
  // rag/ingest.embedFile owns the terminal file status for this stage: 'ready'
  // on success, 'skipped' when there is nothing to embed, 'failed' + error when
  // the Ollama side or persistence fails (then rethrown here).
  if (!config.ragEnabled) {
    console.warn(`Pipeline: RAG disabled (OLLAMA_URL not set) — skipping embedding for file ${fileId}`);
    await db.update(files)
      .set({ status: 'skipped', error: null })
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
    // Belt and braces — embedFile already wrote status/error for its own
    // failures; this also catches anything thrown before its try/catch.
    const message = embedErr instanceof Error ? embedErr.message : 'Embedding failed';
    await db.update(files)
      .set({ status: 'failed', error: message })
      .where(eq(files.id, fileId));
  }
}

/**
 * Called once at API start: files that were pending/processing when the
 * previous process died are marked failed so no file looks like it is
 * "in progress" forever. Re-run them via POST /files/:id/reprocess.
 */
export async function recoverInterruptedPipelines(): Promise<void> {
  try {
    const rows = await db
      .update(files)
      .set({
        status: 'failed',
        error:  'Interrupted by restart',
      })
      .where(inArray(files.status, ['pending', 'processing']))
      .returning({ id: files.id });

    if (rows.length > 0) {
      console.log(`Pipeline: marked ${rows.length} interrupted file(s) as failed`);
    }
  } catch (err) {
    console.error('Pipeline: recovery sweep failed:', err);
  }
}
