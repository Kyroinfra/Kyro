/**
 * Integration test: the one scope resolver for /search and /ask (#37).
 *
 * Two layers against a REAL Postgres:
 *
 *   1. resolveScope() directly — every scope rule and its uniform status:
 *      collection membership (404 unknown / 422 empty), metadata filters
 *      (422 no match), client fileIds narrowed to org-owned files (404 when
 *      nothing is owned), and the intersection of ALL provided constraints
 *      (the #37 bug: /ask used to silently overwrite the filter result when
 *      a collectionId/fileIds branch ran after it).
 *
 *   2. The real GET /search and POST /ask routers via supertest — identical
 *      scope failures answer with identical status codes because both routes
 *      answer from the same resolver. Scope errors return before any retrieval
 *      happens, so these tests need no Ollama (OLLAMA_URL is a dummy needed
 *      only to switch RAG_ENABLED on so /ask reaches its scope section).
 *
 *   The only mock is middleware/auth — auth itself is covered by #29's suites;
 *   these tests assert scope semantics, not key checks.
 *
 * Gated on TEST_DATABASE_URL, like hybridRank.test.ts: without it the suite
 * is skipped so the default jest run needs no database. Seeds a throwaway
 * org (+ a second org for foreign-file ownership checks) and cascade-deletes
 * afterwards.
 */
import './_env';
import { randomUUID } from 'node:crypto';
import express, { type Express } from 'express';
import request from 'supertest';
import { pool } from '../../src/db';
import { resolveScope } from '../../src/rag/scope';
import searchRouter from '../../src/routes/search';
import askRouter from '../../src/routes/ask';

// (The dummy OLLAMA_URL enabling RAG_ENABLED is set by tests/integration/_env.ts
// — the first import above — because config reads the env at module load, before
// this file's own statements run.)

// Auth is out of scope here: inject the test org on every request.
// (Factory state is read at request-handling time, set by the seeding test.)
let mockOrgId = '';
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
}));

const HAS_DB = !!process.env.TEST_DATABASE_URL;
const suite = HAS_DB ? describe : describe.skip;

// ── Seed constants ───────────────────────────────────────────────────────────

const orgA  = randomUUID();   // the querying org
const orgB  = randomUUID();   // holds the "foreign" file
const userA = randomUUID();
const userB = randomUUID();

const fContract = randomUUID(); // metadata: document_type=contract
const fOps      = randomUUID(); // metadata: document_type=operations
const fNoMeta   = randomUUID(); // no metadata rows
const fQuote    = randomUUID(); // metadata value stuffed with quotes/backslashes
const fForeign  = randomUUID(); // belongs to orgB — must always be invisible

// #38: matched by BINDING, not escaping — exotica a quote-escaping
// implementation would botch (doubled quotes, raw backslashes).
const QUOTE_VALUE = 'O\'Neil "quoted" \'values\' + C:\\sweep\\file';

const cBoth  = randomUUID();   // fContract + fOps
const cOps   = randomUUID();   // fOps only
const cEmpty = randomUUID();   // no members

const cUnknown = randomUUID(); // valid uuid, never inserted

async function seedFile(orgId: string, userId: string, fileId: string, name: string) {
  await pool.query(
    'INSERT INTO files (id, org_id, uploaded_by, name, storage_key, mime_type, size_bytes, extracted_text, status) ' +
    'VALUES ($1, $2, $3, $4, $5, \'text/plain\', 100, \'seed\', \'ready\')',
    [fileId, orgId, userId, name, `sweep37/${name}`],
  );
}

async function seedMetadata(fileId: string, metadata: Record<string, string>) {
  await pool.query(
    'UPDATE files SET metadata = metadata || $2::jsonb WHERE id = $1',
    [fileId, JSON.stringify(metadata)],
  );
}

async function seedCollection(orgId: string, userId: string, colId: string, name: string) {
  await pool.query(
    'INSERT INTO collections (id, org_id, created_by, name) VALUES ($1, $2, $3, $4)',
    [colId, orgId, userId, `sweep37-${name}`],
  );
}

async function addMember(colId: string, fileId: string) {
  await pool.query(
    'INSERT INTO collection_files (collection_id, file_id) VALUES ($1, $2)',
    [colId, fileId],
  );
}

suite('scope resolver — uniform /search + /ask scope semantics (#37)', () => {
  const app: Express = express();
  app.use(express.json());
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/ask', askRouter);

  beforeAll(async () => {
    await pool.query(
      'INSERT INTO organisations (id, name, slug) VALUES ($1, \'sweep37-org-a\', $2)',
      [orgA, `sweep37-a-${orgA.slice(0, 8)}`],
    );
    await pool.query(
      'INSERT INTO organisations (id, name, slug) VALUES ($1, \'sweep37-org-b\', $2)',
      [orgB, `sweep37-b-${orgB.slice(0, 8)}`],
    );
    await pool.query(
      'INSERT INTO users (id, org_id, email, password_hash) VALUES ($1, $2, $3, \'x\')',
      [userA, orgA, `${orgA}@sweep37.local`],
    );
    await pool.query(
      'INSERT INTO users (id, org_id, email, password_hash) VALUES ($1, $2, $3, \'x\')',
      [userB, orgB, `${orgB}@sweep37.local`],
    );

    await seedFile(orgA, userA, fContract, 'sweep37-contract.txt');
    await seedFile(orgA, userA, fOps, 'sweep37-operations.txt');
    await seedFile(orgA, userA, fNoMeta, 'sweep37-nometa.txt');
    await seedFile(orgA, userA, fQuote, 'sweep37-quote.txt');
    await seedFile(orgB, userB, fForeign, 'sweep37-foreign.txt');
    await seedMetadata(fContract, { document_type: 'contract' });
    await seedMetadata(fOps, { document_type: 'operations' });
    await seedMetadata(fQuote, { document_type: QUOTE_VALUE });

    await seedCollection(orgA, userA, cBoth, 'both');
    await seedCollection(orgA, userA, cOps, 'ops');
    await seedCollection(orgA, userA, cEmpty, 'empty');
    await addMember(cBoth, fContract);
    await addMember(cBoth, fOps);
    await addMember(cOps, fOps);

    mockOrgId = orgA;
  });

  afterAll(async () => {
    if (!HAS_DB) {return;}
    // The orgs adopt everything (files with their jsonb metadata, collections,
    // users) via ON DELETE CASCADE.
    await pool.query('DELETE FROM organisations WHERE id IN ($1, $2)', [orgA, orgB]);
    await pool.end();
  });

  // ── Layer 1: resolveScope directly ─────────────────────────────────────

  it('no constraints → org-wide (fileIds undefined)', async () => {
    expect(await resolveScope(orgA, {})).toEqual({ fileIds: undefined });
  });

  it('unknown collection → 404', async () => {
    expect(await resolveScope(orgA, { collectionId: cUnknown })).toEqual({
      status: 404,
      error: 'Collection not found',
    });
  });

  it('empty collection → 422', async () => {
    expect(await resolveScope(orgA, { collectionId: cEmpty })).toEqual({
      status: 422,
      error: 'Collection has no files',
    });
  });

  it('collection only → its members', async () => {
    expect(await resolveScope(orgA, { collectionId: cBoth })).toEqual({
      fileIds: [fContract, fOps],
    });
  });

  it('filters only → matching files (AND across keys, OR within values)', async () => {
    expect(
      await resolveScope(orgA, { filters: { document_type: 'contract' } }),
    ).toEqual({ fileIds: [fContract] });

    expect(
      await resolveScope(orgA, {
        filters: { document_type: ['contract', 'operations'] },
      }),
    ).toEqual({ fileIds: [fContract, fOps] });
  });

  it('filters matching nothing → 422', async () => {
    expect(
      await resolveScope(orgA, { filters: { document_type: 'nope' } }),
    ).toEqual({
      status: 422,
      error: 'No files match the provided metadata filters',
    });
  });

  it('a metadata value full of quotes/backslashes is matched by BINDING, not escaping (#38)', async () => {
    expect(
      await resolveScope(orgA, { filters: { document_type: QUOTE_VALUE } }),
    ).toEqual({ fileIds: [fQuote] });
  });

  it('filters + collection → INTERSECTION (the #37 bug, fixed)', async () => {
    // Both satisfied → the intersection.
    expect(
      await resolveScope(orgA, {
        collectionId: cBoth,
        filters: { document_type: 'contract' },
      }),
    ).toEqual({ fileIds: [fContract] });

    // Satisfied by disjoint sets → uniform 422, not a silent overwrite of
    // the filter result.
    expect(
      await resolveScope(orgA, {
        collectionId: cOps,
        filters: { document_type: 'contract' },
      }),
    ).toEqual({ status: 422, error: 'No files match the provided scope filters' });
  });

  it('client fileIds are narrowed to org-owned files; foreign ids never widen the scope', async () => {
    expect(
      await resolveScope(orgA, { fileIds: [fContract, fForeign] }),
    ).toEqual({ fileIds: [fContract] });

    expect(await resolveScope(orgA, { fileIds: [fForeign] })).toEqual({
      status: 404,
      error: 'No matching files found',
    });
  });

  it('collection + fileIds intersect as well (resolver-level composition)', async () => {
    expect(
      await resolveScope(orgA, { collectionId: cBoth, fileIds: [fOps] }),
    ).toEqual({ fileIds: [fOps] });
  });

  // ── Layer 2: both routes answer from the same resolver ─────────────────

  it('GET /search answers the uniform scope errors', async () => {
    // Unknown collection — was 400 before #37, now the /ask code.
    await request(app)
      .get(`/api/v1/search?collection_id=${cUnknown}&q=test`)
      .expect(404)
      .expect('Content-Type', /json/)
      .expect({ error: 'Collection not found' });

    // Empty collection — was 400, now 422.
    await request(app)
      .get(`/api/v1/search?collection_id=${cEmpty}&q=test`)
      .expect(422)
      .expect({ error: 'Collection has no files' });

    // All file_ids foreign — was silently org-wide before #37, now 404.
    await request(app)
      .get(`/api/v1/search?file_ids=${fForeign}&q=test`)
      .expect(404)
      .expect({ error: 'No matching files found' });

    // Filters matching nothing — new surface: 422.
    await request(app)
      .get(`/api/v1/search?filters=${encodeURIComponent('{"document_type":"nope"}')}&q=test`)
      .expect(422)
      .expect({ error: 'No files match the provided metadata filters' });
  });

  it('POST /ask answers the SAME scope errors (identical statuses)', async () => {
    await request(app)
      .post('/api/v1/ask')
      .send({ question: 'test', collectionId: cUnknown })
      .expect(404)
      .expect({ error: 'Collection not found' });

    await request(app)
      .post('/api/v1/ask')
      .send({ question: 'test', collectionId: cEmpty })
      .expect(422)
      .expect({ error: 'Collection has no files' });

    await request(app)
      .post('/api/v1/ask')
      .send({ question: 'test', fileIds: [fForeign] })
      .expect(404)
      .expect({ error: 'No matching files found' });

    await request(app)
      .post('/api/v1/ask')
      .send({ question: 'test', filters: { document_type: 'nope' } })
      .expect(422)
      .expect({ error: 'No files match the provided metadata filters' });
  });

  it('GET /search validation: filters shape + param mutual exclusion', async () => {
    // filters + collection_id together — route-level mutual exclusion, 400.
    await request(app)
      .get(`/api/v1/search?collection_id=${cBoth}&file_ids=${fOps}&q=test`)
      .expect(400)
      .expect({ error: 'Provide either collection_id or file_ids, not both' });

    // Malformed JSON.
    await request(app)
      .get('/api/v1/search?filters=%7Bnope&q=test')
      .expect(400)
      .expect({ error: 'filters must be a URL-encoded JSON object' });

    // JSON but wrong shape (array root).
    await request(app)
      .get(`/api/v1/search?filters=${encodeURIComponent('[1,2]')}&q=test`)
      .expect(400)
      .expect({ error: 'filters must be a JSON object of string or string[] values' });
  });
});
