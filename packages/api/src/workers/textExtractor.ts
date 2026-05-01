import { Worker, UnrecoverableError } from 'bullmq';
import { db } from '../db';
import { files, textExtractionJobs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getFilePath } from '../lib/storage';
import { extractText } from '../lib/extractors';
import { getRedis } from '../db/redis';
// import { runMigrations } from '../db/migrate';
import fs from 'fs';

interface TextExtractionJobData {
  fileId: string;
  storageKey: string;
  mimeType: string;
  jobId: string;
}

async function processTextExtractionJob(job: { data: TextExtractionJobData }): Promise<void> {
  const { fileId, storageKey, mimeType, jobId } = job.data;

  const filePath = getFilePath(storageKey);
  if (!fs.existsSync(filePath)) {
    throw new UnrecoverableError(`File not found at path: ${filePath}`);
  }

  await db.update(textExtractionJobs)
    .set({
      status: 'processing',
      startedAt: new Date(),
    })
    .where(eq(textExtractionJobs.id, jobId));

  try {
    const extractedText = await extractText(mimeType, filePath);

    await db.transaction(async (tx) => {
      await tx.update(files)
        .set({ extractedText })
        .where(eq(files.id, fileId));

      await tx.update(textExtractionJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(textExtractionJobs.id, jobId));
    });

    console.log(`Text extraction completed for file ${fileId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error instanceof UnrecoverableError) {
      await db.update(textExtractionJobs)
        .set({
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(textExtractionJobs.id, jobId));
      throw error;
    }

    const jobRecord = await db.select({ attempts: textExtractionJobs.attempts, maxAttempts: textExtractionJobs.maxAttempts })
      .from(textExtractionJobs)
      .where(eq(textExtractionJobs.id, jobId));

    const attempts = jobRecord[0]?.attempts || 0;
    const maxAttempts = jobRecord[0]?.maxAttempts || 3;

    if (attempts >= maxAttempts) {
      await db.update(textExtractionJobs)
        .set({
          status: 'failed',
          error: `Max retry attempts (${maxAttempts}) exceeded. Last error: ${errorMessage}`,
          completedAt: new Date(),
        })
        .where(eq(textExtractionJobs.id, jobId));
    }

    throw error;
  }
}

async function start() {
  // try {
  //   await runMigrations();
  //   console.log('Worker: Database migrations completed');
  // } catch (error) {
  //   console.error('Worker: Failed to run migrations:', error);
  //   process.exit(1);
  // }

  const redisConnection = getRedis();
  if (!redisConnection) {
    console.error('Worker: Redis not available, exiting');
    process.exit(1);
  }

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

  worker.on('failed', (job, error) => {
    console.error(`Worker: Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('Worker: Worker error:', error);
  });

  console.log('Worker: Text extraction worker started');

  process.on('SIGTERM', async () => {
    console.log('Worker: SIGTERM received, shutting down');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Worker: SIGINT received, shutting down');
    await worker.close();
    process.exit(0);
  });
}

start();
