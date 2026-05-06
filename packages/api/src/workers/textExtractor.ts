import { Worker, UnrecoverableError } from 'bullmq';
import { db } from '../db';
import { files, textExtractionJobs } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getFilePath } from '../lib/storage';
import { extractText } from '../lib/extractors';
import { dispatchWebhookEvent } from '../lib/webhook';
import { getRedis } from '../db/redis';
import { getBullMQRedis } from '../db/redis';
import fs from 'fs';

interface TextExtractionJobData {
    fileId: string;
    storageKey: string;
    mimeType: string;
    jobId: string;
    orgId: string;
}

// On startup, reset any jobs that were left as 'processing' from a previous
// worker crash — they will never complete on their own.
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

async function processTextExtractionJob(job: { data: TextExtractionJobData }): Promise<void> {
    const { fileId, storageKey, mimeType, jobId, orgId } = job.data;

    const filePath = getFilePath(storageKey);
    if (!fs.existsSync(filePath)) {
        throw new UnrecoverableError(`File not found at path: ${filePath}`);
    }

    await db.update(textExtractionJobs)
        .set({
            status: 'processing',
            startedAt: new Date(),
            attempts: db.$count(textExtractionJobs, eq(textExtractionJobs.id, jobId)),
        })
        .where(eq(textExtractionJobs.id, jobId));

    await dispatchWebhookEvent(orgId, 'extraction.started', { fileId, jobId });

    const extractedText = await extractText(mimeType, filePath);

    await db.transaction(async (tx) => {
        await tx.update(files)
            .set({ extractedText })
            .where(eq(files.id, fileId));

        await tx.update(textExtractionJobs)
            .set({ status: 'completed', completedAt: new Date() })
            .where(eq(textExtractionJobs.id, jobId));
    });


    await dispatchWebhookEvent(orgId, 'extraction.completed', { fileId, jobId, extractedTextLength: extractedText.length });

    console.log(`Worker: Text extraction completed for file ${fileId}`);
}
// NOTE: We no longer catch errors here — BullMQ handles retries automatically
// when the job processor throws. The 'failed' event handler below marks the
// DB record as failed only on the *final* attempt.

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
        async (job) => {
            await processTextExtractionJob(job);
        },
        {
            connection: redisConnection,
            concurrency: 3,
        }
    );

    worker.on('completed', (job) => {
        console.log(`Worker: Job ${job.id} completed`);
    });

    worker.on('failed', async (job, error) => {
        if (!job) return;
        const maxAttempts = job.opts.attempts ?? 3;
        const isFinal = job.attemptsMade >= maxAttempts;

        console.error(`Worker: Job ${job.id} attempt ${job.attemptsMade}/${maxAttempts} failed:`, error.message);

        if (isFinal) {
            const { jobId, orgId, fileId } = job.data as TextExtractionJobData;
            try {
                await db.update(textExtractionJobs)
                    .set({ status: 'failed', error: error.message, completedAt: new Date() })
                    .where(eq(textExtractionJobs.id, jobId));

                await dispatchWebhookEvent(orgId, 'extraction.failed', { fileId, jobId, error: error.message });
            } catch (dbErr) {
                console.error('Worker: Failed to mark job as failed in DB:', dbErr);
            }
        }
    });

    worker.on('error', (error) => {
        console.error('Worker: Worker error:', error);
    });

    console.log('Worker: Text extraction worker started');

    async function shutdown(signal: string) {
        console.log(`Worker: ${signal} received, shutting down`);
        await worker.close();
        process.exit(0);
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
