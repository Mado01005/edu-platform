import 'server-only';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  lmsPrisma?: PrismaClient;
};

export function getPrisma() {
  if (!globalForPrisma.lmsPrisma) {
    globalForPrisma.lmsPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  return globalForPrisma.lmsPrisma;
}
