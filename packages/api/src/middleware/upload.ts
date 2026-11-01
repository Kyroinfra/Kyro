import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { createError } from './errorHandler';
import type { AuthedRequest } from './auth';
import { ensureOrgDirectory } from '../lib/storage';
import { SUPPORTED_MIME_TYPES_LIST } from '../lib/extractors';

// (@types/multer models these callbacks inline in DiskStorageOptions —
// local structural aliases keep the callbacks readable.)
type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;

/**
 * Upload handling (#41): everything uploads straight to disk under the org's
 * upload directory — memoryStorage (which buffered every file fully in RAM,
 * then handed the buffer to saveFile() which wrote it to disk anyway) is gone.
 * Peaks no longer scale with file size.
 *
 * The allowlist is derived from the extractors' map (single source of truth —
 * a MIME becomes uploadable-and-extractable the moment an extractor exists)
 * plus the two data formats that are stored without extraction (csv/json,
 * status 'skipped'). Everything else answers 415.
 */

const STORAGE = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: DestinationCallback) => {
    const orgId = (req as AuthedRequest).orgId;
    if (!orgId) {
      // Second arg is required by MulterError contract; value unused on error.
      cb(createError('Authentication required', 401), '');
      return;
    }
    try {
      cb(null, ensureOrgDirectory(orgId));
    } catch (err) {
      cb(err instanceof Error ? err : new Error(String(err)), '');
    }
  },
  filename: (_req: Request, file: Express.Multer.File, cb: FilenameCallback) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname || '')}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    ...SUPPORTED_MIME_TYPES_LIST,
    // Stored without extraction (status 'skipped') — data formats the API
    // keeps even though no extractor exists yet.
    'text/csv',
    'application/json',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Typed error with statusCode 415 — surfaces through multer's next(err)
    // into errorHandler as 415, not 500 (#27).
    cb(createError(`Unsupported file type: ${file.mimetype}`, 415));
  }
};

export const upload = multer({
  storage: STORAGE,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});
