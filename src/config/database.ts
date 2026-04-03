import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Singleton pattern: reuse the same Prisma instance across the app.
// In development, attach to globalThis to survive hot reloads without
// exhausting the DB connection pool.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}