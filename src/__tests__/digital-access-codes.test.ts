const mockCourseFindFirst = jest.fn();
const mockCreateMany = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/lms/notifications', () => ({
  deliverSystemNotification: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    course: { findFirst: mockCourseFindFirst },
    digitalAccessCode: { createMany: mockCreateMany },
  }),
}));

import { generateDigitalAccessCodes } from '@/lib/lms/access-codes';

describe('digital access code generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DIGITAL_CODE_SECRET = 'test-only-digital-code-secret-with-32-characters';
    mockCourseFindFirst.mockResolvedValue({ id: 'course-1' });
    mockCreateMany.mockResolvedValue({ count: 3 });
  });

  it('returns unique 12-digit codes but only persists HMAC hashes', async () => {
    const result = await generateDigitalAccessCodes({
      actorId: 'admin-1',
      count: 3,
      courseId: 'course-1',
    });

    expect(result.codes).toHaveLength(3);
    expect(new Set(result.codes).size).toBe(3);
    expect(result.codes.every((code) => /^\d{12}$/.test(code))).toBe(true);
    const persisted = mockCreateMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(persisted).toHaveLength(3);
    expect(persisted.every((record) => /^[a-f0-9]{64}$/.test(String(record.codeHash)))).toBe(true);
    expect(persisted.every((record) => !('code' in record))).toBe(true);
  });
});
