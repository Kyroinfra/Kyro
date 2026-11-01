/**
 * Integration test: the webhook wire for the cut-down event list (#40).
 *
 * Gated on TEST_DATABASE_URL like the other integration suites. Dispatches
 * the two terminal events through the REAL fan-out core
 * (webhooks/dispatch.dispatchWebhookEvent) against a REAL Postgres, with the
 * webhook rows pointed at an in-process HTTP stub — so what is asserted is
 * the actual wire: exactly one POST per subscribing hook, the signed body
 * (HMAC-SHA256 over the raw payload with the hook's secret), the event and
 * data shapes, and the resulting webhook_deliveries rows in status 'delivered'.
 *
 * The end-to-end trigger (upload → pipeline → dispatch) needs Ollama, so the
 * trigger side is exercised by the live sweep instead; everything after the
 * dispatch point — fan-out, filtering by subscription, signing, delivery
 * bookkeeping — is covered here without it.
 */
import './_env';
import { randomUUID, createHmac } from 'node:crypto';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import type { AddressInfo } from 'node:net';
import { pool } from '../../src/db';
import { dispatchWebhookEvent } from '../../src/webhooks/dispatch';

const HAS_DB = !!process.env.TEST_DATABASE_URL;
const suite = HAS_DB ? describe : describe.skip;

// ── Stub webhook receivers ───────────────────────────────────────────────────

interface StubHit {
  event:     string;
  body:      string;
  signature: string;
}

interface Stub {
  url:  string;
  hits: StubHit[];
  close(): Promise<void>;
}

/** Records every POST with its body and signature so tests can inspect the wire. */
function stubServer(): Promise<Stub> {
  const hits: StubHit[] = [];

  return new Promise<Stub>((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        hits.push({
          event:     String(req.headers['x-kyro-event']),
          body,
          signature: String(req.headers['x-kyro-signature'] ?? ''),
        });
        res.writeHead(200).end();
      });
    });

    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`,
        hits,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

// ── Harness ──────────────────────────────────────────────────────────────────

const orgId = randomUUID();

const hooks: Array<{ id: string; secret: string; events: string[] }> = [
  { id: randomUUID(), secret: 'stub-secret-a', events: ['file.ready'] },
  { id: randomUUID(), secret: 'stub-secret-b', events: ['file.failed'] },
  { id: randomUUID(), secret: 'stub-secret-c', events: ['file.ready', 'file.failed'] },
];

const stubs: Stub[] = [];

/**
 * Deliveries are fire-and-forget: poll the recorded hits instead of reading
 * them the instant dispatch resolves.
 */
async function awaitHits(stub: Stub, expected: number): Promise<StubHit[]> {
  for (let i = 0; i < 200 && stub.hits.length < expected; i++) {
    await sleep(10);
  }
  return stub.hits;
}

/** Signature check against a specific hook — returns true when it verifies. */
function verifies(hook: { secret: string }, hit: StubHit): boolean {
  return hit.signature ===
    'sha256=' + createHmac('sha256', hook.secret).update(hit.body).digest('hex');
}

beforeAll(async () => {
  stubs.push(await stubServer(), await stubServer());
  // H1 → stub 0, H2 → stub 1, H3 → stub 0 (both of H3's events arrive on the
  // first receiver, keeping per-stub hit counts explicit).

  await pool.query(
    'INSERT INTO organisations (id, name, slug) VALUES ($1, $2, $3)',
    [orgId, 'sweep40-webhook-org', `sweep40-${orgId.slice(0, 8)}`],
  );
  for (const [i, hook] of hooks.entries()) {
    await pool.query(
      'INSERT INTO webhooks (id, org_id, url, secret, events) VALUES ($1, $2, $3, $4, $5)',
      [hook.id, orgId, stubs[i === 1 ? 1 : 0].url, hook.secret, hook.events],
    );
  }
});

afterAll(async () => {
  await pool.query('DELETE FROM organisations WHERE id = $1', [orgId]); // cascades
  await Promise.all(stubs.map((s) => s.close()));
  await pool.end();
});

// ── Tests ────────────────────────────────────────────────────────────────────

/**
 * Deliveries land 'delivered' a microtask after the stub's response — poll
 * for the settled rows instead of reading them the instant the hit arrives.
 */
async function awaitDelivered(event: string | null, expectedCount: number): Promise<{ count: number; all_delivered: boolean }> {
  for (let i = 0; i < 100; i++) {
    const rows = await pool.query<{ count: number; all_delivered: boolean }>(
      `SELECT count(*)::int AS count,
              count(*) FILTER (WHERE status = 'delivered')::int = count(*)::int AS all_delivered
       FROM   webhook_deliveries ${event ? 'WHERE event = $1' : ''}`,
      event ? [event] : [],
    );
    if (rows.rows[0].count >= expectedCount && rows.rows[0].all_delivered) { return rows.rows[0]; }
    await sleep(10);
  }
  // Reflect the final measured state for the assertion message.
  const rows = await pool.query<{ count: number; all_delivered: boolean }>(
    `SELECT count(*)::int AS count,
            count(*) FILTER (WHERE status = 'delivered')::int = count(*)::int AS all_delivered
     FROM   webhook_deliveries ${event ? 'WHERE event = $1' : ''}`,
    event ? [event] : [],
  );
  return rows.rows[0];
}

suite('webhook dispatch → wire (#40)', () => {
  it('file.ready reaches every subscribing hook exactly once, signed, and is recorded delivered', async () => {
    const data = { fileId: randomUUID(), chunksCreated: 3, totalTokens: 12 };

    await dispatchWebhookEvent(orgId, 'file.ready', data);

    // stub 0 carries H1 (ready-only) + H3 (multiplexed) — exactly two hits.
    const hits0 = await awaitHits(stubs[0], 2);
    expect(hits0.length).toBe(2);
    for (const hit of hits0) {
      expect(hit.event).toBe('file.ready');
      expect(JSON.parse(hit.body).data).toEqual(data);
    }
    // Order between the two deliveries is unspecified — match them by secret.
    expect(hits0.filter((h) => verifies(hooks[0], h)).length).toBe(1);
    expect(hits0.filter((h) => verifies(hooks[2], h)).length).toBe(1);

    // H2 (file.failed subscriber) stays silent.
    expect(stubs[1].hits.length).toBe(0);

    // Bookkeeping: one row per subscribing hook, all delivered.
    const summary = await awaitDelivered('file.ready', 2);
    expect(summary.count).toBe(2);
    expect(summary.all_delivered).toBe(true);
  });

  it('file.failed reaches failed-subscribers only — ready-only hooks stay silent', async () => {
    const data = { fileId: randomUUID(), error: 'embed exploded', stage: 'embed' };

    await dispatchWebhookEvent(orgId, 'file.failed', data);

    // H2 gets exactly one hit, signed, with the failure payload.
    const hits1 = await awaitHits(stubs[1], 1);
    expect(hits1.length).toBe(1);
    expect(hits1[0].event).toBe('file.failed');
    expect(JSON.parse(hits1[0].body).data).toEqual(data);
    expect(verifies(hooks[1], hits1[0])).toBe(true);

    // H3 is multiplexed on stub 0 — exactly one more hit there (now 3, still no H1 hit).
    const hits0 = await awaitHits(stubs[0], 3);
    expect(hits0.length).toBe(3);
    expect(hits0[2].event).toBe('file.failed');
    expect(JSON.parse(hits0[2].body).data).toEqual(data);
    expect(verifies(hooks[2], hits0[2])).toBe(true);

    // Every delivery row has settled to the terminal success state; no
    // retries hang around as pending (covers both terminals dispatched here).
    const summary = await awaitDelivered(null, 4);
    expect(summary.count).toBe(4);
    expect(summary.all_delivered).toBe(true);
  });

  it('delivered hits never produce retry traffic after the fan-out settles', async () => {
    const before = stubs[0].hits.length + stubs[1].hits.length;
    expect(before).toBe(4); // nothing else was dispatched

    await sleep(500);

    expect(stubs[0].hits.length + stubs[1].hits.length).toBe(before);
  });
});
