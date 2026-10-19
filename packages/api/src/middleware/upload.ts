import multer from 'multer';
import type { Request } from 'express';
import { createError } from './errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Typed error with statusCode 415 — surfaces through multer's next(err)
    // into errorHandler as 415, not 500.
    cb(createError(`Unsupported file type: ${file.mimetype}`, 415));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});
