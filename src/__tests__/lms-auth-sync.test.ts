const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockRecordStudentActivity = jest.fn();
const mockGetClaims = jest.fn();
const mockGetUser = jest.fn();
const mockHeaders = jest.fn();

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
jest.mock('next/headers', () => ({
  cookies: async () => ({ get: () => null, set: () => {} }),
  headers: mockHeaders,
}));
jest.mock('@/lib/supabase/ssr-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getClaims: mockGetClaims, getUser: mockGetUser },
  }),
}));

import { getLmsUser } from '@/lib/lms/auth';

describe('Supabase to Prisma LMS user synchronization', () => {
  beforeEach(() => {
    mockGetClaims.mockReset();
    mockGetUser.mockReset();
    mockUserFindUnique.mockReset();
    mockUserFindFirst.mockReset();
    mockUserCreate.mockReset();
    mockUserUpdate.mockReset();
    mockRecordStudentActivity.mockReset();
    mockHeaders.mockResolvedValue(new Headers());
  });

  it('creates a missing Prisma profile from a verified Supabase user', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          app_metadata: { role: 'TEACHER' },
          email: 'teacher@example.com',
          id: 'supabase-teacher-1',
          phone: null,
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
    expect(mockGetUser).toHaveBeenCalledWith();
    expect(mockGetClaims).not.toHaveBeenCalled();
  });

  it('resolves a verified Bearer identity for API route role checks', async () => {
    mockHeaders.mockResolvedValue(
      new Headers({ authorization: 'Bearer verified.jwt.token' }),
    );
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          app_metadata: { role: 'ADMIN' },
          email: 'admin@example.com',
          id: 'supabase-admin-1',
          phone: null,
          user_metadata: { full_name: 'Admin Example' },
        },
      },
      error: null,
    });
    mockUserFindUnique.mockResolvedValue({
      email: 'admin@example.com',
      id: 'lms-admin-1',
      name: 'Admin Example',
      phoneNumber: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      supabaseId: 'supabase-admin-1',
    });

    const user = await getLmsUser();

    expect(mockGetUser).toHaveBeenCalledWith('verified.jwt.token');
    expect(mockGetClaims).not.toHaveBeenCalled();
    expect(user).toMatchObject({
      email: 'admin@example.com',
      role: 'ADMIN',
      supabaseId: 'supabase-admin-1',
    });
  });

  it('does not fall back to cookie claims for a malformed Authorization header', async () => {
    mockHeaders.mockResolvedValue(
      new Headers({ authorization: 'Basic credentials' }),
    );

    const user = await getLmsUser();

    expect(user).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockGetClaims).not.toHaveBeenCalled();
  });
});
