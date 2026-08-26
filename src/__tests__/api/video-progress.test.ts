const mockRequireLmsRole = jest.fn();
const mockLessonFindFirst = jest.fn();
const mockProgressFindUnique = jest.fn();
const mockProgressUpsert = jest.fn();
const mockAttendanceUpsert = jest.fn();
const mockAttendanceUpdateMany = jest.fn();
const mockRecalculateHealth = jest.fn();

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));

jest.mock('@/lib/lms/health', () => ({
  recalculateStudentHealthScores: mockRecalculateHealth,
}));

jest.mock('@/lib/prisma', () => ({
  getPrisma: () => {
    type MockTransaction = {
      digitalAttendance: {
        updateMany: typeof mockAttendanceUpdateMany;
        upsert: typeof mockAttendanceUpsert;
      };
      lessonProgress: { upsert: typeof mockProgressUpsert };
    };
    const transaction: MockTransaction = {
      digitalAttendance: {
        updateMany: mockAttendanceUpdateMany,
        upsert: mockAttendanceUpsert,
      },
      lessonProgress: { upsert: mockProgressUpsert },
    };
    return {
    $transaction: (operation: (value: MockTransaction) => unknown) => operation(transaction),
    digitalAttendance: transaction.digitalAttendance,
    lesson: { findFirst: mockLessonFindFirst },
    lessonProgress: {
      findUnique: mockProgressFindUnique,
      upsert: mockProgressUpsert,
    },
  };
  },
}));

import { POST as saveVideoProgress } from '@/app/api/lms/progress/video/route';

function progressRequest(watchPercentage: number) {
  return new Request('https://academy.test/api/lms/progress/video', {
    body: JSON.stringify({ lessonId: 'lesson-1', watchPercentage }),
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://academy.test',
    },
    method: 'POST',
  });
}

describe('video progress checkpoints', () => {
  beforeEach(() => {
    mockRequireLmsRole.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
    mockLessonFindFirst.mockResolvedValue({
      contentType: 'R2_VIDEO',
      id: 'lesson-1',
      module: { courseId: 'course-1' },
      videoUrl: 'https://media.example.com/lesson.mp4',
      videoUrl1080: null,
      videoUrl360: null,
      videoUrl480: null,
      videoUrl720: null,
    });
    mockProgressFindUnique.mockResolvedValue(null);
    mockProgressUpsert.mockResolvedValue({ id: 'progress-1' });
    mockAttendanceUpsert.mockResolvedValue({ id: 'attendance-1' });
    mockAttendanceUpdateMany.mockResolvedValue({ count: 1 });
    mockRecalculateHealth.mockResolvedValue([]);
  });

  it('requires the STUDENT role and an enrolled video lesson', async () => {
    const response = await saveVideoProgress(progressRequest(10));

    expect(response.status).toBe(200);
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['STUDENT']);
    expect(mockLessonFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'lesson-1',
        }),
      }),
    );
  });

  it('rejects progress when the lesson has no playable video source', async () => {
    mockLessonFindFirst.mockResolvedValue({
      contentType: 'R2_VIDEO',
      id: 'lesson-1',
      module: { courseId: 'course-1' },
      videoUrl: null,
      videoUrl1080: null,
      videoUrl360: null,
      videoUrl480: null,
      videoUrl720: null,
    });

    const response = await saveVideoProgress(progressRequest(10));

    expect(response.status).toBe(404);
    expect(mockProgressUpsert).not.toHaveBeenCalled();
  });

  it('rejects a progress jump larger than ten percentage points', async () => {
    const response = await saveVideoProgress(progressRequest(30));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/in sequence/i);
    expect(mockProgressUpsert).not.toHaveBeenCalled();
    expect(mockRecalculateHealth).not.toHaveBeenCalled();
  });

  it('preserves existing progress and accepts the next checkpoint', async () => {
    mockProgressFindUnique.mockResolvedValue({
      isCompleted: false,
      updatedAt: new Date('2026-08-05T00:00:00.000Z'),
      watchPercentage: 37.25,
    });

    const response = await saveVideoProgress(progressRequest(40));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ isCompleted: false, watchPercentage: 40 });
    expect(mockProgressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { isCompleted: false, watchPercentage: 40 },
      }),
    );
    expect(mockRecalculateHealth).toHaveBeenCalledWith(['student-1']);
  });

  it('marks a video complete at the 85 percent threshold', async () => {
    mockProgressFindUnique.mockResolvedValue({
      isCompleted: false,
      updatedAt: new Date('2026-08-05T00:00:00.000Z'),
      watchPercentage: 80,
    });

    const response = await saveVideoProgress(progressRequest(85));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ isCompleted: true, watchPercentage: 85 });
    expect(mockAttendanceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          courseId: 'course-1',
          lessonId: 'lesson-1',
          type: 'VIDEO_LESSON',
        }),
      }),
    );
  });

  it('rate-limits immediate sequential checkpoint writes', async () => {
    mockProgressFindUnique.mockResolvedValue({
      isCompleted: false,
      updatedAt: new Date(),
      watchPercentage: 10,
    });

    const response = await saveVideoProgress(progressRequest(20));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.retryAfterMs).toBeGreaterThan(0);
    expect(mockProgressUpsert).not.toHaveBeenCalled();
  });
});
