const mockAuth = jest.fn();
const mockGetSupabaseRequestContext = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/auth', () => ({ auth: mockAuth }));
jest.mock('@/lib/auth-guard', () => ({
  apiUnauthorized: () => new Response(null, { status: 401 }),
  requireApiAuth: jest.fn(),
}));
jest.mock('@/lib/supabase/proxy', () => ({
  getSupabaseRequestContext: mockGetSupabaseRequestContext,
}));
jest.mock('@/lib/lms/parent-session', () => ({
  PARENT_PORTAL_SESSION_COOKIE: 'wayground_mps_session',
  validateParentPortalSessionToken: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

type Profile = {
  active_session_token: string | null;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'TEACHER';
  status: 'ACTIVE' | 'DISABLED';
};

function supabasePageContext(profile: Profile, response = NextResponse.next()) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: profile, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });

  return {
    response,
    supabase: {
      auth: { signOut: jest.fn().mockResolvedValue({ error: null }) },
      from,
    },
    userId: 'supabase-user',
  };
}

function rotatedResponse() {
  const response = NextResponse.next();
  response.cookies.set('sb-auth-token', 'rotated-token', {
    httpOnly: true,
    maxAge: 3_600,
    path: '/',
    sameSite: 'lax',
    secure: true,
  });
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('expires', '0');
  response.headers.set('pragma', 'no-cache');
  return response;
}

describe('Supabase page auth proxy', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockAuth.mockResolvedValue(null);
    mockGetSupabaseRequestContext.mockReset();
    mockGetSupabaseRequestContext.mockResolvedValue({
      response: NextResponse.next(),
      supabase: null,
      userId: null,
    });
  });

  it('authorizes the admin landing page with the Supabase LMS role', async () => {
    mockGetSupabaseRequestContext.mockResolvedValue(
      supabasePageContext({
        active_session_token: null,
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
    );

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/admin'),
    );

    expect(response.status).toBe(200);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('keeps the exact legacy admin landing page compatible with NextAuth', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'legacy-admin' } });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/admin'),
    );

    expect(response.status).toBe(200);
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });

  it('does not extend legacy fallback to nested Supabase admin pages', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'legacy-admin' } });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/admin/users'),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/lms/login');
    expect(location.searchParams.get('next')).toBe('/admin/users');
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('preserves rotated cookies and cache headers on an auth redirect', async () => {
    mockGetSupabaseRequestContext.mockResolvedValue({
      response: rotatedResponse(),
      supabase: null,
      userId: null,
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/settings'),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/lms/login');
    expect(location.searchParams.get('next')).toBe('/settings');
    expect(response.cookies.getAll()).toEqual([
      { name: 'sb-auth-token', value: 'rotated-token' },
    ]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('expires')).toBe('0');
    expect(response.headers.get('pragma')).toBe('no-cache');
  });

  it('redirects an active Supabase user away from the LMS login page', async () => {
    mockGetSupabaseRequestContext.mockResolvedValue(
      supabasePageContext(
        {
          active_session_token: null,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        rotatedResponse(),
      ),
    );

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/lms/login'),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/dashboard');
    expect(response.cookies.getAll()).toContainEqual({
      name: 'sb-auth-token',
      value: 'rotated-token',
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('redirects a teacher who tampers with the admin storage URL', async () => {
    mockGetSupabaseRequestContext.mockResolvedValue(
      supabasePageContext(
        {
          active_session_token: null,
          role: 'TEACHER',
          status: 'ACTIVE',
        },
        rotatedResponse(),
      ),
    );

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/admin/storage'),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/dashboard');
    expect(location.searchParams.get('notice')).toBe('admin-required');
    expect(response.cookies.getAll()).toContainEqual({
      name: 'sb-auth-token',
      value: 'rotated-token',
    });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
