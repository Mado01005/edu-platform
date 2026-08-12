const mockExchangeCodeForSession = jest.fn();
const mockCreateServerClient = jest.fn();
const mockGetPrisma = jest.fn();
const mockGetSupabaseAdminClient = jest.fn();
const mockActivateStudentSession = jest.fn();
const mockActiveSessionCookieOptions = jest.fn();
const mockRecalculateStudentHealthScores = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: mockGetPrisma,
}));
jest.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));
jest.mock('@/lib/lms/active-session', () => ({
  ACTIVE_SESSION_COOKIE: 'lms_active_session',
  activateStudentSession: mockActivateStudentSession,
  activeSessionCookieOptions: mockActiveSessionCookieOptions,
}));
jest.mock('@/lib/lms/health', () => ({
  recalculateStudentHealthScores: mockRecalculateStudentHealthScores,
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/auth/callback/route';

describe('Supabase OAuth callback', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnvironment,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    };
    mockCreateServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (
              cookies: Array<{
                name: string;
                options: Record<string, unknown>;
                value: string;
              }>,
              headers: Record<string, string>,
            ) => void;
          };
        },
      ) => ({
        auth: {
          exchangeCodeForSession: async (code: string) => {
            const result = await mockExchangeCodeForSession(code);
            if (!result.error && result.data.session) {
              options.cookies.setAll(
                [
                  {
                    name: 'sb-auth-token',
                    options: {
                      httpOnly: true,
                      path: '/',
                      sameSite: 'lax',
                    },
                    value: 'settled-session',
                  },
                ],
                {
                  'cache-control':
                    'private, no-cache, no-store, must-revalidate, max-age=0',
                  expires: '0',
                  pragma: 'no-cache',
                },
              );
            }
            return result;
          },
        },
      }),
    );
    mockGetPrisma.mockReturnValue({
      user: {
        upsert: jest.fn().mockResolvedValue({
          email: 'admin@example.com',
          id: 'profile-1',
          role: 'STUDENT',
          supabaseId: 'auth-user-1',
        }),
      },
    });
    mockActivateStudentSession.mockResolvedValue('active-session-token');
    mockActiveSessionCookieOptions.mockReturnValue({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
    mockRecalculateStudentHealthScores.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('handles provider error parameters without attempting code exchange', async () => {
    const response = await GET(
      new NextRequest(
        'https://www.edu-platform.me/auth/callback?error=access_denied&error_description=cancelled&next=%2Fteacher',
      ),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/lms/login');
    expect(location.searchParams.get('error')).toBe(
      'Sign-in was cancelled.',
    );
    expect(location.searchParams.get('next')).toBe('/teacher');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('replaces network-path and backslash redirect targets with dashboard', async () => {
    for (const next of ['//evil.example/path', '/\\evil.example/path']) {
      const url = new URL('https://www.edu-platform.me/auth/callback');
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('next', next);

      const response = await GET(new NextRequest(url));
      const location = new URL(response.headers.get('location')!);

      expect(location.origin).toBe('https://www.edu-platform.me');
      expect(location.searchParams.get('next')).toBe('/dashboard');
    }
  });

  it('handles a missing authorization code as a safe login error', async () => {
    const response = await GET(
      new NextRequest('https://www.edu-platform.me/auth/callback'),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/lms/login');
    expect(location.searchParams.get('error')).toContain('missing or has expired');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('does not expose code-exchange errors in the redirect URL', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error('sensitive upstream detail'),
    });

    const response = await GET(
      new NextRequest(
        'https://www.edu-platform.me/auth/callback?code=single-use-code&next=%2Fsettings',
      ),
    );
    const location = new URL(response.headers.get('location')!);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('single-use-code');
    expect(location.pathname).toBe('/lms/login');
    expect(location.searchParams.get('error')).toBe(
      'Unable to complete sign in. Please try again.',
    );
    expect(location.searchParams.get('error')).not.toContain('sensitive');
    expect(location.searchParams.get('next')).toBe('/settings');
  });

  it('settles PKCE auth cookies on the successful redirect response', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            email: 'admin@example.com',
            id: 'auth-user-1',
            phone: null,
            phone_confirmed_at: null,
            user_metadata: { full_name: 'Admin Tester' },
          },
        },
      },
      error: null,
    });

    const response = await GET(
      new NextRequest(
        'https://www.edu-platform.me/auth/callback?code=single-use-code&next=%2Fadmin',
        { headers: { cookie: 'sb-code-verifier=pkce-verifier' } },
      ),
    );
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/admin');
    expect(response.cookies.getAll()).toEqual(
      expect.arrayContaining([
        { name: 'sb-auth-token', value: 'settled-session' },
        { name: 'lms_active_session', value: 'active-session-token' },
      ]),
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mockRecalculateStudentHealthScores).toHaveBeenCalledWith([
      'profile-1',
    ]);
  });
});
