/**
 * Environment shim for the integration tests — MUST be the first import of a
 * test file (CommonJS requires run in import order, and `src/db` reads the
 * pool connection string from config at import time).
 *
 * When TEST_DATABASE_URL is set (the live-pg run), the shared pool connects
 * there instead of setup-env.ts' placeholder URL; when it is not, the test
 * file that imports this shim is skipped entirely, so normal jest runs stay
 * hermetic.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
