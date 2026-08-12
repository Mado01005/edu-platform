const mockCreateServerClient = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

import { NextRequest } from 'next/server';
import { getSupabaseRequestContext } from '@/lib/supabase/proxy';

describe('Supabase SSR session rotation', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('forwards refreshed cookies and no-store headers to the browser response', async () => {
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
          getClaims: async () => {
            options.cookies.setAll(
              [
                {
                  name: 'sb-auth-token',
                  options: { httpOnly: true },
                  value: 'rotated-token',
                },
              ],
              { 'cache-control': 'private, no-store' },
            );
            return {
              data: { claims: { sub: 'verified-user' } },
              error: null,
            };
          },
        },
      }),
    );

    const context = await getSupabaseRequestContext(
      new NextRequest('https://www.edu-platform.me/settings', {
        headers: { cookie: 'sb-auth-token=expired-token' },
      }),
    );

    expect(context.userId).toBe('verified-user');
    expect(context.response.cookies.getAll()).toEqual([
      { name: 'sb-auth-token', value: 'rotated-token' },
    ]);
    expect(context.response.headers.get('cache-control')).toBe(
      'private, no-store',
    );
  });
});
