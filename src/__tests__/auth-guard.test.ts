const mockGetUser = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/ssr-server', () => ({
  createSupabaseServerClient: mockCreateSupabaseServerClient,
}));

import { requireApiAuth } from '@/lib/auth-guard';

const verifiedUser = {
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2026-08-09T00:00:00.000Z',
  id: 'user-1',
  user_metadata: {},
};

describe('requireApiAuth', () => {
  beforeEach(() => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    });
  });

  it('rejects a request without a bearer token by default', async () => {
    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example'),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected authentication to fail.');
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      error: 'Unauthorized',
    });
    expect(result.response.headers.get('www-authenticate')).toBe('Bearer');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('validates the exact bearer access token with Supabase Auth', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: verifiedUser },
      error: null,
    });

    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example', {
        headers: { authorization: 'Bearer access.jwt.token' },
      }),
    );

    expect(mockGetUser).toHaveBeenCalledWith('access.jwt.token');
    expect(result).toMatchObject({
      accessToken: 'access.jwt.token',
      ok: true,
      source: 'bearer',
      user: { id: 'user-1' },
    });
  });

  it('supports a stateless bearer client when called from Proxy', async () => {
    const proxyGetUser = jest.fn().mockResolvedValue({
      data: { user: verifiedUser },
      error: null,
    });
    const bearerClientFactory = jest.fn().mockReturnValue({
      auth: { getUser: proxyGetUser },
    });

    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example', {
        headers: { authorization: 'Bearer proxy.jwt.token' },
      }),
      { bearerClientFactory },
    );

    expect(bearerClientFactory).toHaveBeenCalledTimes(1);
    expect(proxyGetUser).toHaveBeenCalledWith('proxy.jwt.token');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, source: 'bearer' });
  });

  it('returns the same 401 for an invalid bearer token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token'),
    });

    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example', {
        headers: { authorization: 'Bearer invalid.jwt.token' },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected authentication to fail.');
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      error: 'Unauthorized',
    });
  });

  it('does not downgrade a malformed Authorization header to cookie auth', async () => {
    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example', {
        headers: { authorization: 'Basic credentials' },
      }),
      { allowCookieAuth: true },
    );

    expect(result.ok).toBe(false);
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('allows an explicitly opted-in, server-validated SSR cookie identity', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: verifiedUser },
      error: null,
    });

    const result = await requireApiAuth(
      new Request('https://www.edu-platform.me/api/example'),
      { allowCookieAuth: true },
    );

    expect(mockGetUser).toHaveBeenCalledWith();
    expect(result).toMatchObject({
      accessToken: null,
      ok: true,
      source: 'cookie',
      user: { id: 'user-1' },
    });
  });
});
