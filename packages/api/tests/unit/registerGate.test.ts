/**
 * Unit tests for the signup gate on POST /api/v1/auth/register (#30).
 *
 * The route's DB surface is deliberately small (one count, two indexed
 * lookups, one transaction), so `../db` is mocked with a table-aware stub
 * — no real Postgres, in line with the other unit suites (no harness has
 * one; the live stack covers the DB-backed paths end-to-end).
 *
 * `jest.resetModules()` per test re-evaluates config from the current env,
 * which is how the ALLOW_SIGNUP=true case activates.
 */
import type { Express } from 'express';

type Row = Record<string, unknown>;
type DbState = {
  orgCount: number;
  orgs: Row[];
  users: Row[];
  /** Rows popped in order by the mocked transaction's returning() calls. */
  inserts: Row[];
};

jest.mock('../../src/db', () => {
  const state = {
    orgCount: 0,
    orgs: [] as Row[],
    users: [] as Row[],
    inserts: [] as Row[],
  };

  // Real schema so routers' table identities match (schema.ts has no
  // parent-module imports — verified).
  const schema = jest.requireActual('../../src/db/schema');

  const db: unknown = {
    // Test control surface, accessed via import('../../src/db').
    __setState: (s: Partial<typeof state>) => Object.assign(state, s),

    select: (proj: Record<string, unknown>) => ({
      from: (table: unknown) => {
        let rows: Row[];
        if ('count' in (proj ?? {})) {
          // COUNT(*) row — the register gate and setup-status read this.
          rows = [{ count: state.orgCount }];
        } else if (table === (schema as any).users) {
          rows = state.users;
        } else {
          rows = state.orgs;
        }
        const p = Promise.resolve(rows);
        return { then: p.then.bind(p), catch: p.catch.bind(p), where: () => p };
      },
    }),

    transaction: (fn: (tx: any) => Promise<any>) =>
      fn({
        insert: () => ({
          values: () => ({
            returning: () => {
              const [row] = state.inserts.splice(0, 1);
              return Promise.resolve([row]);
            },
          }),
        }),
      }),
  };

  return { __esModule: true, db, __setState: (db as any).__setState };
});

const BODY = {
  orgName: 'Gate Org',
  email: 'owner@gate.dev',
  password: 'password123',
};

async function setup(s: Partial<DbState>): Promise<Express> {
  // resetModules re-instantiates the mocked ../db, so the state MUST be
  // seeded after the reset (and it double-serves to re-evaluate config
  // from the current process.env — how ALLOW_SIGNUP=true gets activated).
  jest.resetModules();
  const dbModule: any = await import('../../src/db');
  dbModule.__setState(s);
  return (await import('../../src/app')).default;
}

async function register(app: Express, body: Record<string, unknown> = BODY) {
  const { default: request } = await import('supertest');
  return request(app).post('/api/v1/auth/register').send(body);
}

const configuredInserts = () => [
  { id: '00000000-0000-0000-0000-000000001aaa' },
  { id: '00000000-0000-0000-0000-000000001bbb', email: BODY.email, role: 'owner' },
];

describe('POST /register is gated on instance setup state (#30)', () => {
  beforeEach(() => {
    delete process.env.ALLOW_SIGNUP;
  });

  it('a configured instance answers 403 Signup disabled by default', async () => {
    const app = await setup({ orgCount: 3, orgs: [{ id: 'org-1' }], users: [], inserts: [] });

    const res = await register(app);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Signup disabled');
  });

  it('ALLOW_SIGNUP=true reopens signup on a configured instance (201)', async () => {
    process.env.ALLOW_SIGNUP = 'true';
    const app = await setup({
      orgCount: 3,
      orgs: [{ id: 'org-1' }],
      users: [],
      inserts: configuredInserts(),
    });

    const res = await register(app);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('owner');
  });

  it('the first org bootstraps freely on an unconfigured instance', async () => {
    const app = await setup({ orgCount: 0, orgs: [], users: [], inserts: configuredInserts() });

    const res = await register(app);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it('a locked signup does not leak whether the email exists (403, not 400)', async () => {
    const app = await setup({
      orgCount: 1,
      orgs: [{ id: 'org-1' }],
      users: [{ id: 'user-1' }], // BODY.email would be "already registered"
      inserts: [],
    });

    const res = await register(app);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Signup disabled');
  });
});
