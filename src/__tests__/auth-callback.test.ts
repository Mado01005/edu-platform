const mockExchangeCodeForSession = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/ssr-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  }),
}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: jest.fn(),
}));
jest.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: jest.fn(),
}));
jest.mock('@/lib/lms/active-session', () => ({
  ACTIVE_SESSION_COOKIE: 'lms_active_session',
  activateStudentSession: jest.fn(),
  activeSessionCookieOptions: jest.fn(),
}));
jest.mock('@/lib/lms/health', () => ({
  recalculateStudentHealthScores: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/auth/callback/route';

describe('Supabase OAuth callback failures', () => {
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
});
