// src/index.ts — process entry point: startup jobs + server lifecycle.
import app from './app';
import config from './config';
import { recoverInterruptedPipelines } from './lib/pipeline';

async function start() {
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
