import fs from 'fs';
import path from 'path';
import config from '../config';

const UPLOAD_DIR = config.uploadDir;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

export function ensureOrgDirectory(orgId: string): string {
  const orgDir = path.join(UPLOAD_DIR, orgId);
  if (!fs.existsSync(orgDir)) {
    fs.mkdirSync(orgDir, { recursive: true });
  }
  return orgDir;
}

// (saveFile/UploadedFile were removed with #41 — multer's diskStorage writes
// the upload straight into the org directory; nothing buffers it anymore.)

export async function deleteFile(storageKey: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(fullPath)) {
    await fs.promises.unlink(fullPath);
  }
}

export function getFilePath(storageKey: string): string {
  return path.join(UPLOAD_DIR, storageKey);
}

export async function getFileStream(storageKey: string): Promise<NodeJS.ReadableStream> {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  return fs.createReadStream(fullPath);
}
