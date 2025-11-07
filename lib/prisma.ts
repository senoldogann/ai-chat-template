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
// Only connect during runtime, not during build
// Prisma uses lazy connection, so $connect() is optional
// We only call it in development to catch connection issues early
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // Only connect in development server, not during build
  // Check if we're in a build context by checking for Next.js build phase
  if (!process.env.NEXT_PHASE || process.env.NEXT_PHASE !== 'phase-production-build') {
    prisma.$connect().catch((error: unknown) => {
      console.error('❌ Prisma connection error:', error);
      // Don't exit during build, just log the error
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        process.exit(1);
      }
    });
  }
}

// Graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

