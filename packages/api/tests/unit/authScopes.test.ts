/**
 * Unit tests for the unified auth middleware's scope logic (#29).
 *
 * DB-free by design: scopesForRole() is a pure mapping and requireScope()
 * only reads the normalized `scopes` array the middleware sets. The
 * DB-backed credential paths (JWT lookup, API-key hash) are covered by the
 * live stack sweep, since no unit harness has a real Postgres.
 */
import { scopesForRole, requireScope, type AuthedRequest } from '../../src/middleware/auth';

function mockRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('scopesForRole (role read from the DB, not the token)', () => {
  it('owner and admin both get read+write', () => {
    expect(scopesForRole('owner')).toEqual(['read', 'write']);
    expect(scopesForRole('admin')).toEqual(['read', 'write']);
  });

  it('members are read-only', () => {
    expect(scopesForRole('member')).toEqual(['read']);
  });
});

describe('requireScope (single gate, no admin wildcard)', () => {
  it('passes when the normalized scopes include the required scope', () => {
    const next = jest.fn();
    const res = mockRes();
    requireScope('write')({ scopes: ['read', 'write'] } as unknown as AuthedRequest, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('403s when the scope is missing', () => {
    const next = jest.fn();
    const res = mockRes();
    requireScope('write')({ scopes: ['read'] } as unknown as AuthedRequest, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Required scope: write' });
  });

  it('no longer treats the admin scope as a super-scope', () => {
    const next = jest.fn();
    const res = mockRes();
    requireScope('read')({ scopes: ['admin'] } as unknown as AuthedRequest, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('403s safely when scopes are absent', () => {
    const next = jest.fn();
    const res = mockRes();
    requireScope('read')({} as unknown as AuthedRequest, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
