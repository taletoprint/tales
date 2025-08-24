import { PrismaClient } from '@taletoprint/database';

// Global Prisma client for the web app to prevent connection exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __globalPrisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Configure Prisma with better connection pool settings
const prismaClientOptions = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Increase connection pool size and timeout for production workloads
  ...(process.env.NODE_ENV === 'production' && {
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=60&connect_timeout=60',
      },
    },
  }),
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaClientOptions);
} else {
  // In development, use a global variable so the connection survives hot reloads
  if (!global.__globalPrisma) {
    global.__globalPrisma = new PrismaClient(prismaClientOptions);
  }
  prisma = global.__globalPrisma;
}

// Add connection event logging in development
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 1000) {
      console.warn(`Slow query (${e.duration}ms):`, e.query);
    }
  });
}

// Gracefully handle shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };