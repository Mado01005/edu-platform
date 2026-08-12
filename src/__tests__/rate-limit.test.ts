import { TokenBucketRateLimiter } from '@/lib/http/rate-limit';

describe('TokenBucketRateLimiter', () => {
  it('allows a burst, rejects overflow, and refills over time', () => {
    const limiter = new TokenBucketRateLimiter();
    const options = { capacity: 2, refillPerSecond: 1 };

    expect(limiter.consume('login:ip', options, 0)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.consume('login:ip', options, 0)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.consume('login:ip', options, 0)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(limiter.consume('login:ip', options, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it('evicts idle entries instead of growing without a bound', () => {
    const limiter = new TokenBucketRateLimiter({
      idleTtlMs: 100,
      maxEntries: 2,
    });
    const options = { capacity: 1, refillPerSecond: 0.01 };

    expect(limiter.consume('old', options, 0).allowed).toBe(true);
    expect(limiter.consume('old', options, 0).allowed).toBe(false);
    expect(limiter.consume('new', options, 101).allowed).toBe(true);
    expect(limiter.consume('old', options, 101).allowed).toBe(true);
  });

  it('evicts the least-recently-used entry at the hard capacity', () => {
    const limiter = new TokenBucketRateLimiter({
      idleTtlMs: 60_000,
      maxEntries: 2,
    });
    const options = { capacity: 1, refillPerSecond: 0.01 };

    expect(limiter.consume('first', options, 0).allowed).toBe(true);
    expect(limiter.consume('first', options, 0).allowed).toBe(false);
    expect(limiter.consume('second', options, 0).allowed).toBe(true);
    expect(limiter.consume('third', options, 0).allowed).toBe(true);
    expect(limiter.consume('first', options, 0).allowed).toBe(true);
  });
});
