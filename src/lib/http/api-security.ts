import { NextResponse, type NextRequest } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  TokenBucketRateLimiter,
  type TokenBucketOptions,
} from '@/lib/http/rate-limit';

const API_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
const API_REQUEST_HEADERS = 'Authorization, Content-Type, X-CSRF-Token';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ApiRateLimitPolicy = {
  ip: TokenBucketOptions;
  name: string;
  subject?: TokenBucketOptions;
};

const apiRateLimiter = new TokenBucketRateLimiter();

const AUTH_READ_LIMIT: ApiRateLimitPolicy = {
  name: 'auth-read',
  ip: { capacity: 120, refillPerSecond: 2 },
};

const AUTH_WRITE_LIMIT: ApiRateLimitPolicy = {
  name: 'auth-write',
  ip: { capacity: 30, refillPerSecond: 0.5 },
};

const MPS_LOGIN_LIMIT: ApiRateLimitPolicy = {
  name: 'mps-login',
  ip: { capacity: 10, refillPerSecond: 10 / 60 },
};

const MPS_LOGOUT_LIMIT: ApiRateLimitPolicy = {
  name: 'mps-logout',
  ip: { capacity: 30, refillPerSecond: 0.5 },
  subject: { capacity: 15, refillPerSecond: 0.25 },
};

const CRON_LIMIT: ApiRateLimitPolicy = {
  name: 'student-health-cron',
  ip: { capacity: 30, refillPerSecond: 0.5 },
};

const PASSWORD_LIMIT: ApiRateLimitPolicy = {
  name: 'password',
  ip: { capacity: 10, refillPerSecond: 10 / 60 },
  subject: { capacity: 5, refillPerSecond: 5 / 60 },
};

const ACCOUNT_LIMIT: ApiRateLimitPolicy = {
  name: 'account',
  ip: { capacity: 60, refillPerSecond: 1 },
  subject: { capacity: 40, refillPerSecond: 40 / 60 },
};

const PAYMENT_UPLOAD_LIMIT: ApiRateLimitPolicy = {
  name: 'payment-upload',
  ip: { capacity: 20, refillPerSecond: 20 / 60 },
  subject: { capacity: 10, refillPerSecond: 10 / 60 },
};

const PAYMENT_LIMIT: ApiRateLimitPolicy = {
  name: 'payment',
  ip: { capacity: 60, refillPerSecond: 1 },
  subject: { capacity: 30, refillPerSecond: 0.5 },
};

const ADMIN_UPLOAD_LIMIT: ApiRateLimitPolicy = {
  name: 'admin-upload',
  ip: { capacity: 120, refillPerSecond: 2 },
  subject: { capacity: 90, refillPerSecond: 1.5 },
};

const R2_PRESIGN_LIMIT: ApiRateLimitPolicy = {
  name: 'r2-presign',
  ip: { capacity: 30, refillPerSecond: 0.5 },
  subject: { capacity: 20, refillPerSecond: 20 / 60 },
};

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getApiRateLimitPolicy(
  pathname: string,
  method: string,
): ApiRateLimitPolicy | null {
  if (matchesRoute(pathname, '/api/auth')) {
    return method === 'GET' && pathname.endsWith('/session')
      ? AUTH_READ_LIMIT
      : AUTH_WRITE_LIMIT;
  }

  if (pathname === '/api/mps/login') return MPS_LOGIN_LIMIT;
  if (pathname === '/api/mps/logout') return MPS_LOGOUT_LIMIT;
  if (pathname === '/api/cron/student-health') return CRON_LIMIT;
  if (pathname === '/api/settings/password') return PASSWORD_LIMIT;

  if (
    matchesRoute(pathname, '/api/settings') ||
    matchesRoute(pathname, '/api/admin/users')
  ) {
    return ACCOUNT_LIMIT;
  }

  if (pathname === '/api/checkout/upload') return PAYMENT_UPLOAD_LIMIT;

  if (
    matchesRoute(pathname, '/api/checkout') ||
    matchesRoute(pathname, '/api/accounting/online-payments')
  ) {
    return PAYMENT_LIMIT;
  }

  if (
    pathname.startsWith('/api/admin/upload-') ||
    matchesRoute(pathname, '/api/admin/convert-raw') ||
    pathname === '/api/admin/migrate-to-r2'
  ) {
    return ADMIN_UPLOAD_LIMIT;
  }

  if (
    pathname === '/api/storage/presigned' ||
    pathname === '/api/upload/r2'
  ) {
    return R2_PRESIGN_LIMIT;
  }

  return null;
}

function requestIp(request: NextRequest) {
  const forwardedFor = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const value = forwardedFor || request.headers.get('x-real-ip') || 'unknown';

  return value.replace(/[^a-fA-F0-9.:_-]/g, '').slice(0, 128) || 'unknown';
}

function tooManyRequests(
  limit: number,
  remaining: number,
  retryAfterSeconds: number,
) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
      },
    },
  );
}

export function enforceApiRateLimit(
  request: NextRequest,
  policy: ApiRateLimitPolicy,
  dimension: 'ip' | 'subject',
  subject?: string,
) {
  const options = dimension === 'ip' ? policy.ip : policy.subject;
  if (!options) return null;

  const identifier = dimension === 'ip' ? requestIp(request) : subject;
  if (!identifier) return null;

  const result = apiRateLimiter.consume(
    `${policy.name}:${dimension}:${identifier.slice(0, 256)}`,
    options,
  );

  return result.allowed
    ? null
    : tooManyRequests(
        result.limit,
        result.remaining,
        result.retryAfterSeconds,
      );
}

function invalidOrigin() {
  return NextResponse.json(
    { error: 'Invalid request origin.' },
    {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

export function enforceApiOrigin(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    if (!isSameOriginRequest(request)) return invalidOrigin();

    const origin = request.headers.get('origin');
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': API_REQUEST_HEADERS,
        'Access-Control-Allow-Methods': API_METHODS,
        'Access-Control-Max-Age': '600',
        'Cache-Control': 'private, no-store',
        Vary: 'Origin, Access-Control-Request-Headers',
      },
    });
  }

  if (UNSAFE_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return invalidOrigin();
  }

  return null;
}

export function applyApiCorsHeaders(
  request: NextRequest,
  response: NextResponse,
) {
  const origin = request.headers.get('origin');
  if (!origin || !isSameOriginRequest(request)) return response;

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.append('Vary', 'Origin');
  return response;
}

/** Used by focused unit tests so cases do not share warm-instance state. */
export function resetApiRateLimitsForTests() {
  apiRateLimiter.clear();
}
