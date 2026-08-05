const mockUserFindFirst = jest.fn();
const mockUserFindMany = jest.fn();
const mockUserCount = jest.fn();
const mockNotificationFindFirst = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();
const mockDeliverSystemNotification = jest.fn();

jest.mock('server-only', () => ({}));

jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    systemNotification: {
      findFirst: mockNotificationFindFirst,
    },
    user: {
      count: mockUserCount,
      findFirst: mockUserFindFirst,
      findMany: mockUserFindMany,
    },
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: mockGetUserById,
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}));

jest.mock('@/lib/lms/notifications', () => ({
  deliverSystemNotification: mockDeliverSystemNotification,
  NotificationError: class NotificationError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message);
    }
  },
}));

import {
  createStudentSupportNotice,
  resendStudentNotification,
  resetStudentTemporaryPassword,
  searchStudentsForSupport,
} from '@/lib/lms/support';

describe('support portal service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('limits account searches to students and phone/email criteria', async () => {
    mockUserFindMany.mockResolvedValue([]);

    await searchStudentsForSupport('010 2527 2693');

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        where: {
          role: 'STUDENT',
          OR: [
            {
              email: {
                contains: '010 2527 2693',
                mode: 'insensitive',
              },
            },
            { phoneNumber: { contains: '01025272693' } },
          ],
        },
      }),
    );
  });

  it('rejects a short temporary password before loading identity data', async () => {
    await expect(
      resetStudentTemporaryPassword({
        confirmation: true,
        password: 'too-short',
        passwordConfirmation: 'too-short',
        studentId: 'student-1',
      }),
    ).rejects.toMatchObject({ code: 'invalid-password' });

    expect(mockUserFindFirst).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('refuses a password reset when Prisma and Supabase emails differ', async () => {
    mockUserFindFirst.mockResolvedValue({
      email: 'student@example.com',
      id: 'student-1',
      phoneNumber: null,
      supabaseId: 'auth-1',
    });
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          email: 'someone-else@example.com',
          id: 'auth-1',
          user_metadata: {},
        },
      },
      error: null,
    });

    await expect(
      resetStudentTemporaryPassword({
        confirmation: true,
        password: 'Temporary-Password-123',
        passwordConfirmation: 'Temporary-Password-123',
        studentId: 'student-1',
      }),
    ).rejects.toMatchObject({ code: 'identity-mismatch' });

    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('updates the exact auth identity without storing the password in a notice', async () => {
    mockUserFindFirst.mockResolvedValue({
      email: 'student@example.com',
      id: 'student-1',
      phoneNumber: null,
      supabaseId: 'auth-1',
    });
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          email: 'student@example.com',
          id: 'auth-1',
          user_metadata: {},
        },
      },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ data: {}, error: null });
    mockDeliverSystemNotification.mockResolvedValue({ recipients: 1 });

    await resetStudentTemporaryPassword({
      confirmation: true,
      password: 'Temporary-Password-123',
      passwordConfirmation: 'Temporary-Password-123',
      studentId: 'student-1',
    });

    expect(mockUpdateUserById).toHaveBeenCalledWith('auth-1', {
      password: 'Temporary-Password-123',
    });
    expect(mockDeliverSystemNotification).toHaveBeenCalledWith({
      broadcast: false,
      includeParents: false,
      message: expect.any(String),
      studentId: 'student-1',
      title: 'Your password was reset',
      type: 'ANNOUNCEMENT',
      url: '/lms/login',
      userIds: [],
    });
    expect(
      JSON.stringify(mockDeliverSystemNotification.mock.calls),
    ).not.toContain('Temporary-Password-123');
  });

  it('never selects payment notifications for support resend', async () => {
    mockNotificationFindFirst.mockResolvedValue(null);

    await expect(
      resendStudentNotification({
        notificationId: 'notice-1',
        studentId: 'student-1',
      }),
    ).rejects.toMatchObject({ code: 'notification-not-found' });

    const query = mockNotificationFindFirst.mock.calls[0]?.[0];
    expect(query.where.type.in).not.toContain('PAYMENT');
    expect(query.where).toEqual(
      expect.objectContaining({
        id: 'notice-1',
        userId: 'student-1',
      }),
    );
  });

  it('delivers a new support notice through the shared notification service', async () => {
    mockUserCount.mockResolvedValue(1);
    mockDeliverSystemNotification.mockResolvedValue({ recipients: 1 });

    await createStudentSupportNotice({
      message: 'Your account access has been restored.',
      studentId: 'student-1',
      title: 'Account update',
    });

    expect(mockDeliverSystemNotification).toHaveBeenCalledWith({
      broadcast: false,
      includeParents: false,
      message: 'Your account access has been restored.',
      studentId: 'student-1',
      title: 'Account update',
      type: 'ANNOUNCEMENT',
      url: '/dashboard',
      userIds: [],
    });
  });

  it('resends an allowed recent notification through the shared service', async () => {
    mockNotificationFindFirst.mockResolvedValue({
      message: 'Your homework was reviewed.',
      title: 'Grade update',
      type: 'GRADE',
    });
    mockDeliverSystemNotification.mockResolvedValue({ recipients: 1 });

    await resendStudentNotification({
      notificationId: 'notice-1',
      studentId: 'student-1',
    });

    expect(mockDeliverSystemNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Your homework was reviewed.',
        studentId: 'student-1',
        title: 'Grade update',
        type: 'GRADE',
      }),
    );
  });
});
