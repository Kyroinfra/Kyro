/**
 * Integration test: hybrid retrieval ranking against REAL pgvector (#35).
 *
 * Verifies the fused-SQL contract of rag/retrieve.rrfSearch — explicit
 * ORDER BY before LIMIT (deterministic kept set), the query vector bound as
 * $n::vector (never interpolated), and that a true-match chunk outranks a
 * noise chunk for a known query.
 *
 * Gated on TEST_DATABASE_URL: without it the suite is skipped so the default
 * jest run needs no database. With it (e.g. the dev compose postgres), the
 * test seeds a throwaway org → user → file → two chunks with hand-built
 * 768-dim embeddings and cascade-deletes the org afterwards.
 */
import './_env';
import { randomUUID } from 'node:crypto';
import { pool } from '../../src/db';
import { rrfSearch } from '../../src/rag/retrieve';

const HAS_DB = !!process.env.TEST_DATABASE_URL;
const suite = HAS_DB ? describe : describe.skip;

// Query = unit vector e0. Dim 768 matches the pgvector column (nomic).
const buildBasisVector = (i: number): number[] => {
  const v: number[] = new Array(768).fill(0);
  v[i] = 1;
  return v;
};

const QUERY = 'quarterly compliance audits under the velmora act';

// e0 for everything: query vector == true-match embedding (distance 0).
const TRUE_EMBEDDING = buildBasisVector(0);
// e1: orthogonal to e0 → cosine distance 1 (above the 0.5 threshold).
const NOISE_EMBEDDING = buildBasisVector(1);

const TRUE_CONTENT =
  'Quarterly compliance audits are mandatory for every department that ' +
  'processes personal data under the velmora data protection act.';

const NOISE_CONTENT =
  'Warehouse fruit and vegetable inventory arrives on the second tuesday of ' +
  'each month; bad batches are composted behind the loading dock.';

suite('hybrid retrieval ranks the true-match chunk first (real pgvector)', () => {
  const orgId    = randomUUID();
  const userId   = randomUUID();
  const fileId   = randomUUID();
  afterAll(async () => {
    if (!HAS_DB) {return;}
    // The org adopts everything via ON DELETE CASCADE.
    await pool.query('DELETE FROM organisations WHERE id = $1', [orgId]);
    await pool.end();
  });

  it('seeds a throwaway corpus and ranks truth above noise', async () => {
    await pool.query(
      'INSERT INTO organisations (id, name, slug) VALUES ($1, \'sweep35-org\', $2)',
      [orgId, `sweep35-${orgId.slice(0, 8)}`],
    );
    await pool.query(
      'INSERT INTO users (id, org_id, email, password_hash) ' +
      'VALUES ($1, $2, $3, \'x\')',
      [userId, orgId, `${orgId}@sweep35.local`],
    );
    await pool.query(
      'INSERT INTO files (id, org_id, uploaded_by, name, storage_key, mime_type, size_bytes, extracted_text, status) ' +
      'VALUES ($1, $2, $3, \'sweep35.txt\', \'sweep35/throwaway.txt\', \'text/plain\', 100, $4, \'ready\')',
      [fileId, orgId, userId, TRUE_CONTENT],
    );
    // The generated tsvector column fills itself; embeddings are bound params.
    await pool.query(
      'INSERT INTO file_chunks (file_id, org_id, chunk_index, content, embedding, token_count) ' +
      'VALUES ($1, $2, 0, $3, $4::vector, 24)',
      [fileId, orgId, TRUE_CONTENT, `[${TRUE_EMBEDDING.join(',')}]`],
    );
    await pool.query(
      'INSERT INTO file_chunks (file_id, org_id, chunk_index, content, embedding, token_count) ' +
      'VALUES ($1, $2, 1, $3, $4::vector, 24)',
      [fileId, orgId, NOISE_CONTENT, `[${NOISE_EMBEDDING.join(',')}]`],
    );

    const results = await rrfSearch({
      orgId,
      query:       QUERY,
      queryVector: TRUE_EMBEDDING,
      limit:       10,
    });

    // Deterministic kept set: at most both seeded chunks, evaluated once the
    // same way every run.
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThanOrEqual(2);

    // The full-text arm matches only the true chunk; the vector arm matches
    // only the true chunk (noise is at distance 1). So the true chunk is
    // ranked #1 by both arms and its RRF score is 2 × 1/(60+1) ≈ 0.0327.
    expect(results[0].chunkIndex).toBe(0);
    expect(results[0].fileId).toBe(fileId);
    expect(Math.abs(results[0].rrfScore - 2 / (60 + 1))).toBeLessThan(1e-9);

    // The noise chunk must be absent entirely (present in neither arm).
    expect(results.findIndex(r => r.chunkIndex === 1)).toBe(-1);

    // Two runs → identical bytes-out (deterministic kept set + order).
    const second = await rrfSearch({
      orgId,
      query:       QUERY,
      queryVector: TRUE_EMBEDDING,
      limit:       10,
    });
    expect(second).toEqual(results);
  });
});
