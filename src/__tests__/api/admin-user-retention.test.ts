const mockRequireLmsRole = jest.fn();
const mockPermanentlyDeleteUsers = jest.fn();
const mockLegacyAuth = jest.fn();

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

class MockAdminUserError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

jest.mock('server-only', () => ({}));
jest.mock('@/auth', () => ({ auth: mockLegacyAuth }));
jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));
jest.mock('@/lib/lms/admin-users', () => ({ AdminUserError: MockAdminUserError }));
jest.mock('@/lib/lms/admin-user-deletion', () => ({
  permanentlyDeleteUsers: mockPermanentlyDeleteUsers,
}));
jest.mock('@/lib/http/same-origin', () => ({ isSameOriginRequest: () => true }));

import { DELETE } from '@/app/api/admin/users/route';

describe('admin user permanent deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireLmsRole.mockResolvedValue({
      email: 'admin@example.com',
      id: 'admin-1',
      role: 'SUPER_ADMIN',
    });
    mockPermanentlyDeleteUsers.mockResolvedValue({ count: 2, success: true });
  });

  it('supports a bulk array of Prisma user IDs', async () => {
    const response = await DELETE(
      new Request('https://www.edu-platform.me/api/admin/users', {
        body: JSON.stringify({ userIds: ['staff-1', 'staff-2'] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPermanentlyDeleteUsers).toHaveBeenCalledWith({
      actorEmail: 'admin@example.com',
      actorId: 'admin-1',
      actorRole: 'SUPER_ADMIN',
      emails: [],
      userIds: ['staff-1', 'staff-2'],
    });
    await expect(response.json()).resolves.toEqual({ count: 2, success: true });
  });

  it('supports a single legacy team email', async () => {
    const response = await DELETE(
      new Request('https://www.edu-platform.me/api/admin/users', {
        body: JSON.stringify({ email: 'legacy@example.com' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPermanentlyDeleteUsers).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ['legacy@example.com'], userIds: [] }),
    );
  });
});
