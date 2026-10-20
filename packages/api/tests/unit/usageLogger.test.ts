/**
 * Unit tests for the usage logger's response-shape coverage (#31).
 *
 * The old implementation monkey-patched res.send and therefore never
 * logged streaming completions: SSE (POST /ask) and piped file downloads
 * both finished without res.send. The rewrite hooks 'finish', so these
 * tests drive all three completion shapes through tiny in-test Express
 * apps and assert one usage row each.
 *
 * `../db` is mocked to capture inserts; the captured buffer is cleared
 * between tests via the mock's own control surface.
 */
import express, { type Express } from 'express';
import type { Server } from 'http';
import { usageLoggerMiddleware } from '../../src/middleware/usageLogger';

type Row = Record<string, unknown>;
type DbControl = {
  db: unknown;
  __rows: () => Row[];
  __reset: () => void;
};

jest.mock('../../src/db', () => {
  const rows: Row[] = [];

  const db = {
    __rows: () => rows.slice(),
    __reset: () => rows.splice(0),
    insert: () => ({
      values: (v: Row) => {
        rows.push(v);
        return Promise.resolve([v]);
      },
    }),
  };

  return {
    __esModule: true,
    db,
    // expose the control surface at module level too (import('.../db'))
    __rows: () => rows.slice(),
    __reset: () => rows.splice(0),
  };
});

const dbControl = async (): Promise<DbControl> => {
  const m: unknown = await import('../../src/db');
  return m as DbControl;
};

const settle = (ms = 75) => new Promise((r) => setTimeout(r, ms));

let app: Express;
let server: Server;
let port: number;

const listen = (): Promise<number> =>
  new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });

beforeEach(async () => {
  app = express();
  const dbCtl = await dbControl();
  dbCtl.__reset();
});

afterEach(
  () =>
    new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    }),
);

describe('usageLoggerMiddleware logs every response shape (#31)', () => {
  it('logs a normal res.json() response with exact bytesOut', async () => {
    app.get('/api/x', usageLoggerMiddleware, (_req, res) => {
      res.json({ ok: true }); // body width 11 → Content-Length 11
    });
    port = await listen();

    await fetch(`http://127.0.0.1:${port}/api/x`);
    await settle();

    const rows = (await dbControl()).__rows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      endpoint: '/api/x',
      method: 'GET',
      statusCode: 200,
      bytesIn: 0,
      bytesOut: 11, // header respected, as before
    });
  });

  it('logs a streamed SSE-style response (the /ask shape that was never logged)', async () => {
    app.post('/api/ask', usageLoggerMiddleware, (_req, res) => {
      res.statusCode = 200;
      res.write('data: first\n\n');
      res.write('data: second\n\n');
      res.end();
    });
    port = await listen();

    // Streamed responses carry no Content-Length — bytesOut logs as 0.
    await fetch(`http://127.0.0.1:${port}/api/ask`, { method: 'POST' });
    await settle();

    const rows = (await dbControl()).__rows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      endpoint: '/api/ask',
      method: 'POST',
      statusCode: 200,
      bytesOut: 0,
    });
  });

  it('logs a piped file download (the GET /files/:id shape)', async () => {
    const chunk = 'kyro-usage-probe'; // 16 bytes
    app.get('/api/file', usageLoggerMiddleware, (_req, res) => {
      res.setHeader('Content-Length', String(chunk.length));
      res.write(chunk);
      res.end();
    });
    port = await listen();

    const res = await fetch(`http://127.0.0.1:${port}/api/file`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(chunk);
    await settle();

    const rows = (await dbControl()).__rows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ endpoint: '/api/file', statusCode: 200, bytesOut: 16 });
  });

  it('records non-zero responseMs and forwards request content-length', async () => {
    app.post('/api/in', usageLoggerMiddleware, (req, res) => {
      req.resume(); // drain the body
      req.on('end', () => res.json({ ok: true }));
    });
    port = await listen();

    await fetch(`http://127.0.0.1:${port}/api/in`, { method: 'POST', body: 'anything' });
    await settle();

    const rows = (await dbControl()).__rows();
    expect(rows).toHaveLength(1);
    expect((rows[0] as { bytesIn: number }).bytesIn).toBe(8);
    expect((rows[0] as { responseMs: number }).responseMs).toBeGreaterThanOrEqual(0);
  });
});
