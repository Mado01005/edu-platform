const mockRequireLmsRole = jest.fn();

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

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));
jest.mock('@/lib/lms/admin-users', () => ({
  AdminUserError: MockAdminUserError,
}));
jest.mock('@/lib/http/same-origin', () => ({
  isSameOriginRequest: () => true,
}));

import { DELETE } from '@/app/api/admin/users/delete/route';

describe('admin user audit-history retention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireLmsRole.mockResolvedValue({
      id: 'admin-1',
      role: 'SUPER_ADMIN',
    });
  });

  it('rejects permanent deletion and directs operators to disable instead', async () => {
    const response = await DELETE(
      new Request('https://www.edu-platform.me/api/admin/users/delete', {
        body: JSON.stringify({ targetId: 'student-1' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        'Permanent user deletion is disabled to preserve learning and financial audit history. Disable the account instead.',
    });
  });
});
