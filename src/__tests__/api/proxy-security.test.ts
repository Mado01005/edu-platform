const mockAuth = jest.fn();
const mockRequireApiAuth = jest.fn();
const mockGetSupabaseRequestContext = jest.fn();
const mockValidateParentPortalSessionToken = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/auth', () => ({ auth: mockAuth }));
jest.mock('@/lib/auth-guard', () => ({
  apiUnauthorized: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
    }),
  requireApiAuth: mockRequireApiAuth,
}));
jest.mock('@/lib/supabase/proxy', () => ({
  getSupabaseRequestContext: mockGetSupabaseRequestContext,
}));
jest.mock('@/lib/lms/parent-session', () => ({
  PARENT_PORTAL_SESSION_COOKIE: 'wayground_mps_session',
  validateParentPortalSessionToken: mockValidateParentPortalSessionToken,
}));

import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';
import { resetApiRateLimitsForTests } from '@/lib/http/api-security';

function nextResponse() {
  return NextResponse.next();
}

describe('global API proxy security', () => {
  beforeEach(() => {
    resetApiRateLimitsForTests();
    mockRequireApiAuth.mockReset();
    mockValidateParentPortalSessionToken.mockReset();
    mockValidateParentPortalSessionToken.mockResolvedValue(null);
    mockAuth.mockResolvedValue(null);
    mockGetSupabaseRequestContext.mockResolvedValue({
      response: nextResponse(),
      supabase: null,
      userId: null,
    });
  });

  it('returns 401 before an ordinary API route runs without a valid session', async () => {
    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages'),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('serves public image assets without invoking authentication', async () => {
    const response = await proxy(
      new NextRequest(
        'https://www.edu-platform.me/images/catalog-learning-hero.png',
      ),
    );

    expect(response.status).toBe(200);
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('keeps the public support page anonymous while protecting support operations', async () => {
    const publicResponse = await proxy(
      new NextRequest('https://www.edu-platform.me/support'),
    );
    const operationsResponse = await proxy(
      new NextRequest('https://www.edu-platform.me/support/operations'),
    );

    expect(publicResponse.status).toBe(200);
    expect(operationsResponse.status).toBe(307);
    expect(operationsResponse.headers.get('location')).toBe(
      'https://www.edu-platform.me/lms/login?next=%2Fsupport%2Foperations',
    );
  });

  it('accepts a server-validated Supabase bearer access token', async () => {
    mockRequireApiAuth.mockResolvedValue({
      accessToken: 'valid.jwt',
      ok: true,
      source: 'bearer',
      user: { id: 'supabase-user' },
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages', {
        headers: { authorization: 'Bearer valid.jwt' },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockRequireApiAuth).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        bearerClientFactory: expect.any(Function),
      }),
    );
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('never downgrades an invalid Authorization header to cookie auth', async () => {
    mockRequireApiAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    });
    mockAuth.mockResolvedValue({ user: { id: 'legacy-user' } });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages', {
        headers: { authorization: 'Bearer invalid.jwt' },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('accepts a validated Supabase cookie session', async () => {
    mockGetSupabaseRequestContext.mockResolvedValue({
      response: nextResponse(),
      supabase: {},
      userId: 'cookie-user',
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages'),
    );

    expect(response.status).toBe(200);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('preserves a signed legacy NextAuth cookie as a compatibility fallback', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'legacy-user' } });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages'),
    );

    expect(response.status).toBe(200);
  });

  it('does not let a legacy NextAuth cookie authorize a Supabase-only API', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'legacy-user' } });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/lms/session'),
    );

    expect(response.status).toBe(401);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('rejects an unsafe cross-origin request with 403 before authentication', async () => {
    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages', {
        method: 'POST',
        headers: { origin: 'https://phishing.example' },
      }),
    );

    expect(response.status).toBe(403);
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('answers a same-origin CORS preflight without invoking a route', async () => {
    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/messages', {
        method: 'OPTIONS',
        headers: { origin: 'https://www.edu-platform.me' },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://www.edu-platform.me',
    );
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/api/auth/session'],
    ['POST', '/api/mps/login'],
    ['POST', '/api/support/inquiries'],
    ['POST', '/api/cron/student-health'],
  ])('narrowly exempts %s %s from user JWT auth', async (method, pathname) => {
    const response = await proxy(
      new NextRequest(`https://www.edu-platform.me${pathname}`, {
        method,
        headers:
          method === 'POST'
            ? { origin: 'https://www.edu-platform.me' }
            : undefined,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('hard-fails invalid Authorization on a login bootstrap route', async () => {
    mockRequireApiAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/login', {
        method: 'POST',
        headers: {
          authorization: 'Bearer invalid.jwt',
          origin: 'https://www.edu-platform.me',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockRequireApiAuth).toHaveBeenCalledTimes(1);
  });

  it('leaves CRON_SECRET Bearer validation to the cron route itself', async () => {
    const response = await proxy(
      new NextRequest(
        'https://www.edu-platform.me/api/cron/student-health',
        { headers: { authorization: 'Bearer cron-secret' } },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRequireApiAuth).not.toHaveBeenCalled();
  });

  it('requires a live custom MPS session for parent logout', async () => {
    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/logout', {
        method: 'POST',
        headers: { origin: 'https://www.edu-platform.me' },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockValidateParentPortalSessionToken).toHaveBeenCalledWith(
      undefined,
    );
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('does not let a Supabase Bearer replace the required MPS session', async () => {
    mockRequireApiAuth.mockResolvedValue({
      accessToken: 'valid.jwt',
      ok: true,
      source: 'bearer',
      user: { id: 'supabase-user' },
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/logout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid.jwt',
          origin: 'https://www.edu-platform.me',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockValidateParentPortalSessionToken).toHaveBeenCalledWith(
      undefined,
    );
  });

  it('allows parent logout after validating its opaque HttpOnly cookie', async () => {
    mockValidateParentPortalSessionToken.mockResolvedValue({
      id: 'mps-session',
      parent: { id: 'parent-1' },
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/logout', {
        method: 'POST',
        headers: {
          cookie: `wayground_mps_session=${'a'.repeat(43)}`,
          origin: 'https://www.edu-platform.me',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockValidateParentPortalSessionToken).toHaveBeenCalledWith(
      'a'.repeat(43),
    );
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('hard-fails an invalid Bearer before custom MPS cookie fallback', async () => {
    mockRequireApiAuth.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }),
    });
    mockValidateParentPortalSessionToken.mockResolvedValue({
      id: 'mps-session',
      parent: { id: 'parent-1' },
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/logout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer expired.jwt',
          cookie: `wayground_mps_session=${'a'.repeat(43)}`,
          origin: 'https://www.edu-platform.me',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(mockValidateParentPortalSessionToken).not.toHaveBeenCalled();
  });

  it('does not broaden exact login exemptions to nested API paths', async () => {
    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/api/mps/login/extra'),
    );

    expect(response.status).toBe(401);
  });

  it('rate-limits the parent-login bootstrap by IP with Retry-After', async () => {
    let response: Response | undefined;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = await proxy(
        new NextRequest('https://www.edu-platform.me/api/mps/login', {
          method: 'POST',
          headers: {
            origin: 'https://www.edu-platform.me',
            'x-forwarded-for': '203.0.113.8',
          },
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('rate-limits public support inquiries by IP with Retry-After', async () => {
    let response: Response | undefined;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await proxy(
        new NextRequest(
          'https://www.edu-platform.me/api/support/inquiries',
          {
            method: 'POST',
            headers: {
              origin: 'https://www.edu-platform.me',
              'x-forwarded-for': '203.0.113.44',
            },
          },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toMatch(/^\d+$/);
    expect(mockGetSupabaseRequestContext).not.toHaveBeenCalled();
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('rate-limits authenticated parent-session teardown', async () => {
    mockValidateParentPortalSessionToken.mockResolvedValue({
      id: 'mps-session',
      parent: { id: 'parent-1' },
    });
    let response: Response | undefined;

    for (let attempt = 0; attempt < 31; attempt += 1) {
      response = await proxy(
        new NextRequest('https://www.edu-platform.me/api/mps/logout', {
          method: 'POST',
          headers: {
            cookie: `wayground_mps_session=${'a'.repeat(43)}`,
            origin: 'https://www.edu-platform.me',
            'x-forwarded-for': '203.0.113.9',
          },
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('rate-limits sensitive authenticated operations by validated subject', async () => {
    mockRequireApiAuth.mockResolvedValue({
      accessToken: 'valid.jwt',
      ok: true,
      source: 'bearer',
      user: { id: 'same-supabase-user' },
    });
    let response: Response | undefined;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await proxy(
        new NextRequest('https://www.edu-platform.me/api/settings/password', {
          method: 'POST',
          headers: {
            authorization: 'Bearer valid.jwt',
            origin: 'https://www.edu-platform.me',
            'x-forwarded-for': `203.0.113.${20 + attempt}`,
          },
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('protects the canonical presigned upload endpoint', async () => {
    const response = await proxy(
      new NextRequest(
        'https://www.edu-platform.me/api/storage/presigned',
        {
          method: 'POST',
          headers: { origin: 'https://www.edu-platform.me' },
        },
      ),
    );

    expect(response.status).toBe(401);
    expect(mockAuth).not.toHaveBeenCalled();
  });
});
