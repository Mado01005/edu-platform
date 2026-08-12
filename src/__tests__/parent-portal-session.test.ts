const mockSessionFindFirst = jest.fn();
const mockSessionUpdate = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    parentPortalSession: {
      findFirst: mockSessionFindFirst,
      update: mockSessionUpdate,
    },
  }),
}));

import { createHash } from 'node:crypto';
import { validateParentPortalSessionToken } from '@/lib/lms/parent-session';

describe('parent portal session token validation', () => {
  beforeEach(() => {
    mockSessionFindFirst.mockReset();
    mockSessionUpdate.mockReset();
  });

  it('rejects a malformed opaque cookie without querying the database', async () => {
    await expect(validateParentPortalSessionToken('invalid')).resolves.toBeNull();
    expect(mockSessionFindFirst).not.toHaveBeenCalled();
  });

  it('requires an unexpired, unrevoked session for an active parent', async () => {
    const token = 'a'.repeat(43);
    mockSessionFindFirst.mockResolvedValue(null);

    await expect(validateParentPortalSessionToken(token)).resolves.toBeNull();
    expect(mockSessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          revokedAt: null,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          parent: { role: 'PARENT', status: 'ACTIVE' },
        }),
      }),
    );
  });

  it('returns a valid session and refreshes stale activity metadata', async () => {
    const session = {
      id: 'session-1',
      lastSeenAt: new Date(Date.now() - 6 * 60_000),
      parent: { id: 'parent-1' },
    };
    mockSessionFindFirst.mockResolvedValue(session);
    mockSessionUpdate.mockResolvedValue({});

    await expect(
      validateParentPortalSessionToken('b'.repeat(43)),
    ).resolves.toBe(session);
    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { lastSeenAt: expect.any(Date) },
    });
  });
});
