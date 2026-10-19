/**
 * Default environment for unit tests.
 *
 * config/index.ts validates and requires DATABASE_URL / JWT_SECRET at import
 * time, so tests that trigger that import chain need a sane environment.
 * Values set here never override variables that are already present
 * (dotenv's reset only fills gaps — same rule for real deployments).
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/kyro_test';
process.env.JWT_SECRET ??= 'unit-test-secret-do-not-use-in-prod';
