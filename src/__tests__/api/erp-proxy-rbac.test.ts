const mockAuth = jest.fn();
const mockGetSupabaseRequestContext = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/auth', () => ({ auth: mockAuth }));
jest.mock('@/lib/supabase/proxy', () => ({
  getSupabaseRequestContext: mockGetSupabaseRequestContext,
}));

import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

function accountingContext(role: string) {
  const profileQuery = {
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { role, status: 'ACTIVE' },
      error: null,
    }),
    select: jest.fn().mockReturnThis(),
  };

  return {
    response: NextResponse.next(),
    supabase: { from: jest.fn(() => profileQuery) },
    userId: 'authenticated-user-id',
  };
}

describe('ERP proxy role redirects', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(null);
  });

  it.each(['TEACHER', 'SUPPORT'])(
    'redirects %s away from accounting with HTTP 307',
    async (role) => {
      mockGetSupabaseRequestContext.mockResolvedValue(
        accountingContext(role),
      );

      const response = await proxy(
        new NextRequest('https://www.edu-platform.me/accounting'),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        'https://www.edu-platform.me/dashboard?notice=accounting-required',
      );
    },
  );

  it('routes a verified session with a missing profile through Prisma sync', async () => {
    const profileQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
    };
    mockGetSupabaseRequestContext.mockResolvedValue({
      response: NextResponse.next(),
      supabase: { from: jest.fn(() => profileQuery) },
      userId: 'authenticated-user-id',
    });

    const response = await proxy(
      new NextRequest('https://www.edu-platform.me/teacher/courses'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://www.edu-platform.me/auth/sync?next=%2Fteacher%2Fcourses',
    );
  });
});
