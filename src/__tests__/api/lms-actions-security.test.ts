const mockRequireLmsRole = jest.fn();
const mockRequireLmsUser = jest.fn();
const mockCourseCreate = jest.fn();
const mockCourseFindUnique = jest.fn();

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
      findUnique: mockCourseFindUnique,
    },
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import {
  createCourseAction,
  enrollCourseAction,
  scheduleZoomAction,
  updateLessonProgressAction,
} from '@/app/lms/actions';

describe('LMS Server Action role boundaries', () => {
  beforeEach(() => {
    mockRequireLmsRole.mockRejectedValue(
      new MockLmsAuthError('Forbidden', 403),
    );
  });

  it('requires teacher or admin role before creating a course', async () => {
    const formData = new FormData();
    formData.set('title', 'Unauthorized course');

    await expect(createCourseAction(formData)).rejects.toMatchObject({
      status: 403,
    });
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['TEACHER', 'ADMIN']);
    expect(mockCourseCreate).not.toHaveBeenCalled();
  });

  it('requires student role before enrolling', async () => {
    await expect(enrollCourseAction('course_1')).rejects.toMatchObject({
      status: 403,
    });
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['STUDENT']);
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
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['TEACHER', 'ADMIN']);
    expect(mockCourseFindUnique).not.toHaveBeenCalled();
  });
});
