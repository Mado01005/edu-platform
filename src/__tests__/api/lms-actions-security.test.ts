const mockRequireLmsRole = jest.fn();
const mockRequireLmsUser = jest.fn();
const mockCourseCreate = jest.fn();
const mockCourseFindUnique = jest.fn();
const mockCourseFindFirst = jest.fn();
const mockEnrollmentUpsert = jest.fn();
const mockLessonFindUnique = jest.fn();
const mockProgressUpsert = jest.fn();
const mockRedirect = jest.fn();
const mockIsRedirectError = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('nanoid', () => ({ nanoid: () => 'a1b2' }));

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
  requireLmsUser: mockRequireLmsUser,
}));

jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    course: {
      create: mockCourseCreate,
      findFirst: mockCourseFindFirst,
      findUnique: mockCourseFindUnique,
    },
    enrollment: { upsert: mockEnrollmentUpsert },
    lesson: { findUnique: mockLessonFindUnique },
    lessonProgress: { upsert: mockProgressUpsert },
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

jest.mock('next/dist/client/components/redirect-error', () => ({
  isRedirectError: mockIsRedirectError,
}));

import {
  createCourseAction,
  enrollCourseAction,
  scheduleZoomAction,
  updateLessonProgressAction,
} from '@/app/lms/actions';

describe('LMS Server Action role boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedirectError.mockReturnValue(false);
    mockRequireLmsRole.mockRejectedValue(
      new MockLmsAuthError('Forbidden', 403),
    );
  });

  it('does not let the generic server action bypass video checkpoints', async () => {
    mockRequireLmsRole.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
    mockLessonFindUnique.mockResolvedValue({
      contentType: 'YOUTUBE',
      module: { courseId: 'course-1' },
    });

    await expect(
      updateLessonProgressAction('video-lesson-1', true),
    ).rejects.toMatchObject({
      message: 'Video progress must be recorded by the video player.',
      status: 409,
    });
    expect(mockProgressUpsert).not.toHaveBeenCalled();
  });

  it('requires teacher or admin role before creating a course', async () => {
    const formData = new FormData();
    formData.set('title', 'Unauthorized course');

    await expect(
      createCourseAction({ error: null, success: false }, formData),
    ).resolves.toMatchObject({
      error: 'Forbidden',
      success: false,
    });
    expect(mockRequireLmsRole).toHaveBeenCalledWith([
      'SUPER_ADMIN',
      'ADMIN',
      'TEACHER',
    ]);
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });

  it('creates collision-resistant course slugs for valid teacher input', async () => {
    mockRequireLmsRole.mockResolvedValue({ id: 'teacher-1', role: 'TEACHER' });
    mockCourseCreate.mockResolvedValue({ id: 'course-1' });
    const formData = new FormData();
    formData.set('title', 'Physics Foundations');
    formData.set('description', 'A practical physics course.');

    await createCourseAction(
      { error: null, success: false },
      formData,
    );

    expect(mockCourseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'A practical physics course.',
        slug: expect.stringMatching(/^physics-foundations-[a-z0-9_-]{4}$/),
        teacherId: 'teacher-1',
        title: 'Physics Foundations',
      }),
    });
    expect(mockRedirect).toHaveBeenCalledWith('/teacher/courses/course-1/edit');
  });

  it('rethrows Next.js redirect exceptions instead of reporting a save crash', async () => {
    const redirectError = new Error('NEXT_REDIRECT');
    mockRequireLmsRole.mockResolvedValue({ id: 'teacher-1', role: 'TEACHER' });
    mockCourseCreate.mockResolvedValue({ id: 'course-1' });
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });
    mockIsRedirectError.mockImplementation((error) => error === redirectError);
    const formData = new FormData();
    formData.set('title', 'Redirect-safe course');

    await expect(
      createCourseAction({ error: null, success: false }, formData),
    ).rejects.toBe(redirectError);
  });

  it('requires student role before enrolling', async () => {
    await expect(enrollCourseAction('course_1')).rejects.toMatchObject({
      status: 403,
    });
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['STUDENT']);
  });

  it('does not let the free enrollment action bypass paid checkout', async () => {
    mockRequireLmsRole.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
    mockCourseFindFirst.mockResolvedValue({
      id: 'course-1',
      modules: [],
      priceEGP: { gt: () => true },
      priceUSD: { gt: () => false },
    });

    await expect(enrollCourseAction('course-1')).rejects.toMatchObject({
      message: 'Paid courses require an approved online payment.',
      status: 409,
    });
    expect(mockEnrollmentUpsert).not.toHaveBeenCalled();
  });

  it('requires student role before writing progress', async () => {
    await expect(
      updateLessonProgressAction('lesson_1', true),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['STUDENT']);
  });

  it('requires teacher or admin role before scheduling Zoom', async () => {
    await expect(
      scheduleZoomAction('course_1', new FormData()),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockRequireLmsRole).toHaveBeenCalledWith([
      'SUPER_ADMIN',
      'ADMIN',
      'TEACHER',
    ]);
    expect(mockCourseFindUnique).not.toHaveBeenCalled();
  });
});
