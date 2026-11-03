// src/index.ts — process entry point: startup jobs + server lifecycle.
import app from './app';
import config from './config';
import { runMigrationsUnderLock } from './db/migrate';
import { recoverInterruptedPipelines } from './lib/pipeline';

async function start() {
  // Migrations run on every api start under an advisory lock (#46) — no
  // one-shot migrate service anymore, and concurrent starts (replica
  // scale-ups, compose up racing a restart) queue instead of racing. Must
  // precede recoverInterruptedPipelines, whose queries read fresh schema.
  await runMigrationsUnderLock();

  await recoverInterruptedPipelines();

  const server = app.listen(config.port, () => {
    console.log(`[${config.nodeEnv}] Server running on port ${config.port}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
