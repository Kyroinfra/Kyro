import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

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

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
  size: number;
}

export async function saveFile(orgId: string, file: UploadedFile): Promise<{ storageKey: string; fileId: string }> {
  const fileId = randomUUID();
  const ext = path.extname(file.originalname);
  const storageKey = path.join(orgId, fileId + ext);
  const fullPath = path.join(UPLOAD_DIR, storageKey);

  ensureOrgDirectory(orgId);

  await fs.promises.writeFile(fullPath, file.buffer);

  return { storageKey, fileId };
}

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
