const mockRequireLmsRole = jest.fn();
const mockAssignmentFindFirst = jest.fn();
const mockExamAttemptFindMany = jest.fn();
const mockExamAttemptCreate = jest.fn();
const mockUserCount = jest.fn();
const mockSubmissionFindUnique = jest.fn();
const mockSubmissionUpsert = jest.fn();
const mockProgressUpsert = jest.fn();
const mockTransaction = jest.fn();
const mockDeleteR2Object = jest.fn();
const mockGetR2ObjectMetadata = jest.fn();
const mockRecalculateHealth = jest.fn();

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

const transactionClient = {
  assignmentSubmission: {
    findUnique: mockSubmissionFindUnique,
    upsert: mockSubmissionUpsert,
  },
  lessonProgress: { upsert: mockProgressUpsert },
};

jest.mock('@/lib/http/same-origin', () => ({
  isSameOriginRequest: () => true,
}));
jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));
jest.mock('@/lib/lms/health', () => ({
  recalculateStudentHealthScores: mockRecalculateHealth,
}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: mockTransaction,
    assignment: { findFirst: mockAssignmentFindFirst },
    examAttempt: {
      create: mockExamAttemptCreate,
      findMany: mockExamAttemptFindMany,
    },
    user: { count: mockUserCount },
  }),
}));
jest.mock('@/lib/r2', () => ({
  deleteR2Object: mockDeleteR2Object,
  getPublicUrl: (key: string) => `https://media.example.test/${key}`,
  getR2ObjectMetadata: mockGetR2ObjectMetadata,
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { POST as startExam } from '@/app/api/lms/exams/[assignmentId]/attempt/route';
import { POST as bootstrapParentOtp } from '@/app/api/parent/otp/route';
import { POST as submitHomework } from '@/app/api/lms/assignments/[assignmentId]/submit/route';

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Origin: new URL(url).origin,
    },
    method: 'POST',
  });
}

describe('Oqool enterprise API contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireLmsRole.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
    mockDeleteR2Object.mockResolvedValue(undefined);
    mockRecalculateHealth.mockResolvedValue([]);
    mockSubmissionFindUnique.mockResolvedValue(null);
    mockSubmissionUpsert.mockResolvedValue({ id: 'submission-1' });
    mockProgressUpsert.mockResolvedValue({ id: 'progress-1' });
    mockTransaction.mockImplementation(
      (operation: (tx: typeof transactionClient) => unknown) =>
        operation(transactionClient),
    );
  });

  it('returns a timed shuffled exam attempt without leaking answers', async () => {
    const startedAt = new Date('2026-08-26T10:00:00.000Z');
    mockAssignmentFindFirst.mockResolvedValue({
      dueAt: null,
      durationMin: 45,
      maxAttempts: 2,
      questions: [
        {
          correctOptionKey: 'a',
          diagramUrl: null,
          id: 'question-1',
          options: [
            { key: 'a', text: '$2$' },
            { key: 'b', text: '$3$' },
          ],
          position: 0,
          prompt: '$\\int_0^\\pi \\sin(x)dx$',
          workedSolution: 'Integrate step by step.',
        },
      ],
    });
    mockExamAttemptFindMany.mockResolvedValue([
      {
        answerOrder: { 'question-1': ['b', 'a'] },
        attemptNumber: 1,
        id: 'attempt-1',
        questionOrder: ['question-1'],
        startedAt,
        submittedAt: null,
      },
    ]);

    const response = await startExam(
      jsonRequest('https://academy.test/api/lms/exams/exam-1/attempt', {}),
      { params: Promise.resolve({ assignmentId: 'exam-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      attemptId: 'attempt-1',
      attemptNumber: 1,
      deadline: '2026-08-26T10:45:00.000Z',
      questions: [
        {
          diagramUrl: null,
          id: 'question-1',
          options: [
            { key: 'b', text: '$3$' },
            { key: 'a', text: '$2$' },
          ],
          prompt: '$\\int_0^\\pi \\sin(x)dx$',
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('correctOptionKey');
    expect(JSON.stringify(body)).not.toContain('workedSolution');
  });

  it('honors the configured two-attempt retake limit', async () => {
    mockAssignmentFindFirst.mockResolvedValue({
      dueAt: null,
      durationMin: 45,
      maxAttempts: 2,
      questions: [{ id: 'question-1', options: [] }],
    });
    mockExamAttemptFindMany.mockResolvedValue([
      { attemptNumber: 2, submittedAt: new Date() },
      { attemptNumber: 1, submittedAt: new Date() },
    ]);

    const response = await startExam(
      jsonRequest('https://academy.test/api/lms/exams/exam-1/attempt', {}),
      { params: Promise.resolve({ assignmentId: 'exam-1' }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'No retake attempts remain.',
    });
    expect(mockExamAttemptCreate).not.toHaveBeenCalled();
  });

  it('bootstraps parent OTP only for a linked active student number', async () => {
    mockUserCount.mockResolvedValue(1);

    const response = await bootstrapParentOtp(
      jsonRequest('https://academy.test/api/parent/otp', {
        phone: '+20 101 234 5678',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ phone: '+201012345678' });
    expect(mockUserCount).toHaveBeenCalledWith({
      where: {
        parentPhone: '+201012345678',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
  });

  it('saves a text-only homework submission and progress atomically', async () => {
    mockAssignmentFindFirst.mockResolvedValue({
      courseId: 'course-1',
      lessonId: 'lesson-1',
    });

    const response = await submitHomework(
      jsonRequest(
        'https://academy.test/api/lms/assignments/homework-1/submit',
        { textSolution: 'A complete written derivation.' },
      ),
      { params: Promise.resolve({ assignmentId: 'homework-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockSubmissionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          attachmentObjectKeys: [],
          attachmentUrls: [],
          fileType: null,
          objectKey: null,
          textSolution: 'A complete written derivation.',
        }),
      }),
    );
    expect(mockProgressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isCompleted: true,
          lessonId: 'lesson-1',
          studentId: 'student-1',
        }),
      }),
    );
    expect(mockGetR2ObjectMetadata).not.toHaveBeenCalled();
  });

  it('removes a newly uploaded homework image when verification fails', async () => {
    const objectKey =
      'lms/student-1/assignment-submissions/homework-1/page-1.jpg';
    mockAssignmentFindFirst.mockResolvedValue({
      courseId: 'course-1',
      lessonId: 'lesson-1',
    });
    mockGetR2ObjectMetadata.mockResolvedValue(null);

    const response = await submitHomework(
      jsonRequest(
        'https://academy.test/api/lms/assignments/homework-1/submit',
        { files: [{ fileType: 'JPG', objectKey }] },
      ),
      { params: Promise.resolve({ assignmentId: 'homework-1' }) },
    );

    expect(response.status).toBe(409);
    expect(mockDeleteR2Object).toHaveBeenCalledWith(objectKey);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
