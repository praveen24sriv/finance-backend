import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// On SIGTERM/SIGINT (Docker stop, Ctrl+C), stop accepting new connections,
// finish in-flight requests, then close the DB connection cleanly.
// This prevents dropped requests during deployments.
async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Could not close connections in time, forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit cleanly
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});