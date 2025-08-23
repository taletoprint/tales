import { PrismaClient } from '@taletoprint/database';

// Global Prisma client for the web app to prevent connection exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __globalPrisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable so the connection survives hot reloads
  if (!global.__globalPrisma) {
    global.__globalPrisma = new PrismaClient();
  }
  prisma = global.__globalPrisma;
}

export { prisma };