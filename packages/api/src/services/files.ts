// services/files.ts — the one upload path (#41)
//
// stores a multer diskStorage file: enforces the deployment-wide
// STORAGE_LIMIT cap (#54 — not a per-org quota), inserts the record
// ('pending' for extractable MIME, 'skipped' for the stored-without-
// extraction formats), and fires the ingest pipeline for extractables.
//
// Routes stay thin: auth/attribution and the no-file 400 remain there;
// errors thrown here surface through the single error handler (#27).

import { db } from '../db';
import { files } from '../db/schema';
import { sql } from 'drizzle-orm';
import path from 'path';
import { createError } from '../middleware/errorHandler';
import { SUPPORTED_MIME_TYPES_LIST } from '../lib/extractors';
import { runPipeline } from '../lib/pipeline';
import config from '../config';

/**
 * Persists an uploaded file (already written to disk by multer's
 * diskStorage) and kicks off extraction when the MIME has an extractor.
 * Returns the created record (same row shape the route used to return).
 */
export async function createFileUpload(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
) {
    // Deployment-wide disk-safety cap from config — not a per-org quota.
    const [storageRow] = await db
        .select({ used: sql`COALESCE(SUM(${files.sizeBytes}), 0)`.mapWith(Number) })
        .from(files);
    const usedStorage = storageRow?.used ?? 0;

    if (usedStorage + file.size > config.storageLimit) {
        throw createError('Storage limit reached', 507);
    }

    const storageKey = path.join(orgId, file.filename);
    const isExtractable = SUPPORTED_MIME_TYPES_LIST.includes(file.mimetype ?? '');

    // One status from the moment of insert (#33): extractable files start the
    // pipeline immediately ('pending' → 'processing' → ...), MIME with nothing
    // to ingest is 'skipped'.
    const [record] = await db
        .insert(files)
        .values({
            orgId,
            uploadedBy: userId,
            name:       file.originalname,
            storageKey,
            mimeType:   file.mimetype,
            sizeBytes:  file.size,
            status:     isExtractable ? 'pending' : 'skipped',
        })
        .returning({
            id:        files.id,
            name:      files.name,
            mimeType:  files.mimeType,
            sizeBytes: files.sizeBytes,
            createdAt: files.createdAt,
            status:    files.status,
        });

    if (isExtractable) {
        runPipeline({
            fileId:   record.id,
            storageKey,
            mimeType: file.mimetype ?? '',
            orgId,
        });
    }

    return record;
}
