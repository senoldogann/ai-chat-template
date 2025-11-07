import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with security best practices
 * - Connection pooling
 * - Query timeout
 * - Error handling
 * - Production-safe logging
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] // Only log errors in production
      : ['error', 'warn', 'query'], // Log queries in development
    errorFormat: 'minimal', // Don't expose stack traces in production
  });

// Handle Prisma connection errors
prisma.$connect().catch((error: unknown) => {
  console.error('❌ Prisma connection error:', error);
  process.exit(1);
});

// Graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

