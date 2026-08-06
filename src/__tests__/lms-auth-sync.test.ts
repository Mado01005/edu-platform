const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockRecordStudentActivity = jest.fn();
const mockGetClaims = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    user: {
      create: mockUserCreate,
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  }),
}));
jest.mock('@/lib/lms/health', () => ({
  recordStudentActivity: mockRecordStudentActivity,
}));
jest.mock('@/lib/supabase/ssr-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getClaims: mockGetClaims },
  }),
}));

import { getLmsUser } from '@/lib/lms/auth';

describe('Supabase to Prisma LMS user synchronization', () => {
  it('creates a missing Prisma profile from verified Supabase claims', async () => {
    mockGetClaims.mockResolvedValue({
      data: {
        claims: {
          app_metadata: { role: 'TEACHER' },
          email: 'teacher@example.com',
          sub: 'supabase-teacher-1',
          user_metadata: { full_name: 'Teacher Example' },
        },
      },
      error: null,
    });
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockUserCreate.mockResolvedValue({
      email: 'teacher@example.com',
      id: 'lms-teacher-1',
      name: 'Teacher Example',
      phoneNumber: null,
      role: 'TEACHER',
      status: 'ACTIVE',
      supabaseId: 'supabase-teacher-1',
    });

    const user = await getLmsUser();

    expect(user).toMatchObject({
      email: 'teacher@example.com',
      role: 'TEACHER',
      supabaseId: 'supabase-teacher-1',
    });
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: {
        email: 'teacher@example.com',
        name: 'Teacher Example',
        phoneNumber: null,
        role: 'TEACHER',
        supabaseId: 'supabase-teacher-1',
      },
    });
    expect(mockRecordStudentActivity).not.toHaveBeenCalled();
  });
});
