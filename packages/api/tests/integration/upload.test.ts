/**
 * Integration test: the upload path over real disk + real DB (#41).
 *
 * Exercises the full POST /files flow through the real route, the real
 * multer diskStorage filter, services/files.createFileUpload (storage cap →
 * insert → pipeline kickoff) and the real mammoth/pipeline extract stage —
 * against a REAL Postgres. Gated on TEST_DATABASE_URL like the other
 * integration suites: without it the whole suite is skipped.
 *
 * Hermetic ceiling: extraction is local (mammoth/pdfminer), embedding dials
 * the dummy OLLAMA_URL from _env.ts (nothing listens there), so extractable
 * files end 'failed' from the embed stage. What is asserted here is the
 * #41 headline — the DOCX MIME now reaches the pipeline — proven bona fide
 * via the marker text extracted through the real docx extractor. The full
 * 'ready' terminal state needs Ollama and is covered by the live sweep.
 */
import './_env';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import request from 'supertest';
import { pool } from '../../src/db';
import config from '../../src/config';
import { errorHandler } from '../../src/middleware/errorHandler';
import filesRouter from '../../src/routes/files';

// Facts for the fileFilter/services assertions.
import { SUPPORTED_MIME_TYPES_LIST } from '../../src/lib/extractors';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MARKER = 'Kyro docx sweep forty-one';

// Auth is out of scope here: inject the test org + user on every request.
let mockOrgId = '';
let mockUserId = '';
jest.mock('../../src/middleware/auth', () => ({
  __esModule: true,
  requireScope: (_scope: string) => (
    req: { orgId?: string },
    _res: unknown,
    next: () => void,
  ) => {
    req.orgId = mockOrgId;
    next();
  },
  // Uploads attribute via this function (both credential kinds); the mock
  // keeps the service path identical to production.
  resolveUserId: async () => mockUserId,
}));

const HAS_DB = !!process.env.TEST_DATABASE_URL;
const suite = HAS_DB ? describe : describe.skip;

let app: Express;
const uploadedIds: string[] = [];
let fixture: Buffer;

/** Poll GET /:id/text until the pipeline has settled, then return it. */
async function pollText(id: string, tries = 100): Promise<{ status: string; extractedText: string; error?: string }> {
  const call = () =>
    request(app).get(`/api/v1/files/${id}/text`).expect((r) => {
      if (r.status >= 500) { throw new Error(`poll: ${r.status}`); }
    });

  let body: { status: string; extractedText: string; error?: string } | null = null;
  for (let i = 0; i < tries; i++) {
    const res = await call();
    body = res.body;
    if (body && body.status !== 'pending' && body.status !== 'processing') { break; }
    await new Promise<void>((r) => setTimeout(r, 50));
  }
  if (!body) { throw new Error('pollText: no response'); }
  return body;
}

beforeAll(async () => {
  fixture = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'real.docx'));

  mockOrgId = randomUUID();
  mockUserId = randomUUID();

  await pool.query(
    'INSERT INTO organisations (id, name, slug) VALUES ($1, $2, $3)',
    [mockOrgId, 'sweep41-upload-org', `sweep41-${mockOrgId.slice(0, 8)}`],
  );
  // Real users row: files.uploaded_by carries an FK, and createFileUpload
  // inserts with the resolved userId.
  await pool.query(
    'INSERT INTO users (id, org_id, email, password_hash, role) VALUES ($1, $2, $3, \'test-hash\', \'owner\')',
    [mockUserId, mockOrgId, `sweep41-${mockOrgId.slice(0, 8)}@kyro.test`],
  );

  app = express();
  app.use(express.json());
  app.use('/api/v1/files', filesRouter);
  app.use(errorHandler);
});

// Dummy row for the 507 test: seeded with sizeBytes at the cap so every
// upload overflows. Lives in the mock org → cascade-cleans with it.
afterAll(async () => {
  if (!mockOrgId) { return; } // beforeAll failed — nothing to clean
  // org deletion cascades every file row, including the seeded 507 ghost
  await pool.query('DELETE FROM organisations WHERE id = $1', [mockOrgId]);
  // disk cleanup for everything the mock org wrote (best effort)
  try { fs.rmSync(path.join(config.uploadDir, mockOrgId), { recursive: true, force: true }); } catch { /* best effort */ }
  await pool.end();
});

const upload = (buf: Buffer | string, name: string, contentType: string) =>
  request(app)
    .post('/api/v1/files')
    .attach('file', buf, { filename: name, contentType });

suite('upload path over disk + db (#41)', () => {
  it('a real DOCX upload is accepted, passes the file filter, and extracts text via mammoth', async () => {
    const res = await upload(fixture, 'matter-sweep41.docx', DOCX_MIME).expect(201);

    expect(res.body).toMatchObject({
      name: 'matter-sweep41.docx',
      mimeType: DOCX_MIME,
      status: 'pending',
    });
    uploadedIds.push(res.body.id);

    const text = await pollText(res.body.id);
    expect(text.extractedText).toContain(MARKER);
  });

  it('plain TXT still extracts through the diskStorage → service → pipeline path', async () => {
    const res = await upload(
      Buffer.from('Kyro sweep forty-one plain text marker material.'),
      'notes-sweep41.txt',
      'text/plain',
    ).expect(201);

    expect(SUPPORTED_MIME_TYPES_LIST.includes(res.body.mimeType)).toBe(true);
    expect(res.body.status).toBe('pending');
    uploadedIds.push(res.body.id);

    const text = await pollText(res.body.id);
    expect(text.extractedText).toContain('sweep forty-one plain text marker');
  });

  it('CSV uploads are stored without extraction (status skipped immediately)', async () => {
    const res = await upload(
      Buffer.from('col_a,col_b\n1,2\n'),
      'table-sweep41.csv',
      'text/csv',
    ).expect(201);

    expect(res.body.status).toBe('skipped');
    uploadedIds.push(res.body.id);
  });

  it('cut MIME types answer the typed 415 (regression — none may reach the route handler)', async () => {
    // audio/mpeg, video/mp4, image/png, application/zip and octet-stream were
    // allowed before the curation; all of them fail the filter now and none
    // creates a file record.
    const cases = [
      ['audio/mpeg', 'noise-sweep41.mp3'],
      ['video/mp4', 'clip-sweep41.mp4'],
      ['image/png', 'pic-sweep41.png'],
      ['application/zip', 'archive-sweep41.zip'],
      ['application/octet-stream', 'mislabeled-sweep41.bin'],
    ] as const;

    for (const [contentType, name] of cases) {
      const res = await upload(Buffer.from('x'), name, contentType);
      expect(res.status).toBe(415);
      expect(res.body.error.message).toContain('Unsupported file type');
    }

    // And nothing was inserted for any of them:
    const { rows } = await pool.query(
      'SELECT count(*)::int AS count FROM files WHERE org_id = $1 AND name LIKE \'%-sweep41.%\'',
      [mockOrgId],
    );
    expect(rows[0].count).toBe(uploadedIds.length);
  });

  it('breaching the deployment-wide storage cap answers 507 with the unified body', async () => {
    // Seed an org-owned ghost with sizeBytes at the cap → uploads overflow.
    const ghostId = randomUUID();
    await pool.query(
      `INSERT INTO files (id, org_id, uploaded_by, name, storage_key, mime_type, size_bytes, status)
       VALUES ($1, $2, $3, 'sweep41-ghost.dat', 'ghost/sweep41.dat', 'text/plain', $4, 'skipped')`,
      [ghostId, mockOrgId, mockUserId, config.storageLimit],
    );

    const res = await upload(fixture, 'overflow-sweep41.docx', DOCX_MIME);
    expect(res.status).toBe(507);
    expect(res.body.error.message).toBe('Storage limit reached');
    // The old flat 507 shape carried limitBytes/usedBytes — the unified
    // error body has no side fields.
    expect(res.body.error.limitBytes).toBeUndefined();
    expect(res.body.error.usedBytes).toBeUndefined();
  });
});
