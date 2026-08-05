const mockRefreshAllStudentHealthScores = jest.fn();

jest.mock('@/lib/lms/health', () => ({
  refreshAllStudentHealthScores: mockRefreshAllStudentHealthScores,
}));

import { GET } from '@/app/api/cron/student-health/route';

describe('student health cron route', () => {
  const previousCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterAll(() => {
    if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCronSecret;
  });

  it('rejects a request without the Vercel cron bearer secret', async () => {
    const response = await GET(
      new Request('https://www.edu-platform.me/api/cron/student-health'),
    );

    expect(response.status).toBe(401);
    expect(mockRefreshAllStudentHealthScores).not.toHaveBeenCalled();
  });

  it('recalculates all active students and reports the at-risk count', async () => {
    mockRefreshAllStudentHealthScores.mockResolvedValue({
      atRisk: 2,
      batches: 1,
      processed: 3,
      skipped: false,
    });

    const response = await GET(
      new Request('https://www.edu-platform.me/api/cron/student-health', {
        headers: { authorization: 'Bearer cron-secret' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      atRisk: 2,
      batches: 1,
      processed: 3,
      skipped: false,
      success: true,
    });
  });
});
