/**
 * Error-path tests for the single central error handling (#27).
 *
 * The headline case migrates the Express-4 hang: an async handler that
 * rejects (DB down) used to be swallowed silently and the request hung
 * forever. Express 5 auto-forwards it to errorHandler, which must answer
 * with a 500 JSON body — supertest would time out (jest kills the test)
 * if the promise forwarding were broken.
 */
import type { Express } from 'express';

// Point the pool at a port that is closed on loopback — connects fail
// instantly with ECONNREFUSED, deterministically, in any environment.
// This MUST run before the dynamic config/db import below so the pool is
// built with it (dotenv only fills gaps; it never overrides an existing var).
process.env.DATABASE_URL = 'postgres://kyro:kyro@127.0.0.1:5439/none';

let app: Express;

beforeAll(async () => {
  app = (await import('../../src/app')).default;
});

describe('async route rejections reach the error handler (Express 5 forwarding)', () => {
  it('POST /api/v1/webhooks with a failing DB answers 500 JSON instead of hanging', async () => {
    const { signJWT } = await import('../../src/lib/auth');

    // Valid token, owner role — auth middleware passes, then the first DB
    // query rejects against the unreachable pool.
    const token = signJWT({
      userId: '00000000-0000-0000-0000-000000000000',
      orgId: '00000000-0000-0000-0000-000000000000',
      role: 'owner',
    });

    const res = await import('supertest').then(({ default: request }) =>
      request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com/hook', events: ['extraction.completed'] }),
    );

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBeDefined();
  });

  it('requests with no token still get an explicit 401 (no crash path change)', async () => {
    const { default: request } = await import('supertest');

    const res = await request(app)
      .post('/api/v1/webhooks')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('unknown route stays 404 via notFoundHandler (single error path intact)', async () => {
    const { default: request } = await import('supertest');

    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.statusCode).toBe(404);
  });
});
