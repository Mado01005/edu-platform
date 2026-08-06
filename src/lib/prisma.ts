import 'server-only';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const RETRYABLE_PRISMA_CODES = new Set([
  'P1001',
  'P1002',
  'P1008',
  'P1017',
]);

function runtimeDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) return undefined;

  try {
    const databaseUrl = new URL(configuredUrl);

    if (databaseUrl.port === '6543') {
      databaseUrl.searchParams.set('pgbouncer', 'true');
      databaseUrl.searchParams.set('connection_limit', '10');
    }

    return databaseUrl.toString();
  } catch {
    return configuredUrl;
  }
}

const datasourceUrl = runtimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function getPrisma() {
  return prisma;
}

function isRetryablePrismaError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code =
    Reflect.get(error, 'code') ?? Reflect.get(error, 'errorCode');
  return typeof code === 'string' && RETRYABLE_PRISMA_CODES.has(code);
}

export async function withPrismaRetry<T>(
  operation: (database: PrismaClient) => Promise<T>,
  maxAttempts = 2,
) {
  const attempts = Math.max(1, Math.min(maxAttempts, 3));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(prisma);
    } catch (error) {
      const retry = attempt < attempts && isRetryablePrismaError(error);

      if (process.env.NODE_ENV === 'development') {
        console.error('[PRISMA_QUERY_ERROR]', {
          attempt,
          code:
            error && typeof error === 'object'
              ? Reflect.get(error, 'code') ??
                Reflect.get(error, 'errorCode')
              : undefined,
          error,
          retry,
        });
      }

      if (!retry) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }

  throw new Error('Prisma retry attempts were exhausted.');
}
