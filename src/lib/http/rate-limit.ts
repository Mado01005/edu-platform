export type TokenBucketOptions = {
  capacity: number;
  refillPerSecond: number;
};

export type TokenBucketResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  lastSeenAt: number;
  tokens: number;
  updatedAt: number;
};

type TokenBucketRateLimiterOptions = {
  idleTtlMs?: number;
  maxEntries?: number;
};

const DEFAULT_IDLE_TTL_MS = 15 * 60 * 1_000;
const DEFAULT_MAX_ENTRIES = 5_000;
const MAX_PRUNE_INTERVAL_MS = 60_000;

/**
 * A bounded, best-effort token bucket for a single Node.js process.
 *
 * Vercel instances do not share memory, so this limits bursts per warm
 * instance. Production-wide enforcement should additionally use Vercel
 * Firewall or a shared store when one is available.
 */
export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly idleTtlMs: number;
  private readonly maxEntries: number;
  private lastPrunedAt = 0;

  constructor(options: TokenBucketRateLimiterOptions = {}) {
    this.idleTtlMs = Math.max(0, options.idleTtlMs ?? DEFAULT_IDLE_TTL_MS);
    this.maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  }

  consume(
    key: string,
    options: TokenBucketOptions,
    now = Date.now(),
  ): TokenBucketResult {
    const capacity = Math.max(1, options.capacity);
    const refillPerSecond = Math.max(Number.EPSILON, options.refillPerSecond);

    this.prune(now);

    const existing = this.buckets.get(key);
    const elapsedSeconds = existing
      ? Math.max(0, now - existing.updatedAt) / 1_000
      : 0;
    const available = existing
      ? Math.min(capacity, existing.tokens + elapsedSeconds * refillPerSecond)
      : capacity;
    const allowed = available >= 1;
    const tokens = allowed ? available - 1 : available;

    // Refresh insertion order so emergency capacity eviction approximates LRU.
    this.buckets.delete(key);
    this.buckets.set(key, {
      lastSeenAt: now,
      tokens,
      updatedAt: now,
    });

    return {
      allowed,
      limit: capacity,
      remaining: Math.max(0, Math.floor(tokens)),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((1 - tokens) / refillPerSecond)),
    };
  }

  clear() {
    this.buckets.clear();
    this.lastPrunedAt = 0;
  }

  private prune(now: number) {
    const pruneInterval = Math.min(
      MAX_PRUNE_INTERVAL_MS,
      Math.max(1, this.idleTtlMs),
    );
    if (
      this.buckets.size < this.maxEntries &&
      now - this.lastPrunedAt < pruneInterval
    ) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastSeenAt > this.idleTtlMs) {
        this.buckets.delete(key);
      }
    }
    this.lastPrunedAt = now;

    while (this.buckets.size >= this.maxEntries) {
      const oldestKey = this.buckets.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.buckets.delete(oldestKey);
    }
  }
}
