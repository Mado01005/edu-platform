const mockRequireLmsRole = jest.fn();
const mockRequireLmsUser = jest.fn();
const mockCourseFindFirst = jest.fn();
const mockLessonFindFirst = jest.fn();
const mockMaterialCreate = jest.fn();
const mockMaterialFindUnique = jest.fn();
const mockMaterialDelete = jest.fn();
const mockVerifyR2ObjectExists = jest.fn();
const mockDeleteR2Object = jest.fn();
const mockGetPresignedDownloadUrl = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/http/same-origin', () => ({
  isSameOriginRequest: () => true,
}));
jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: class LmsAuthError extends Error {
    constructor(message: string, public readonly status = 401) {
      super(message);
    }
  },
  requireLmsRole: mockRequireLmsRole,
  requireLmsUser: mockRequireLmsUser,
}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    course: { findFirst: mockCourseFindFirst },
    courseMaterial: {
      create: mockMaterialCreate,
      delete: mockMaterialDelete,
      findUnique: mockMaterialFindUnique,
    },
    lesson: { findFirst: mockLessonFindFirst },
  }),
}));
jest.mock('@/lib/r2', () => ({
  deleteR2Object: mockDeleteR2Object,
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
  getPublicUrl: (key: string) => `https://media.example.com/${key}`,
  verifyR2ObjectExists: mockVerifyR2ObjectExists,
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { POST as createMaterial } from '@/app/api/lms/materials/route';
import { DELETE as deleteMaterial } from '@/app/api/lms/materials/[materialId]/route';
import { GET as downloadMaterial } from '@/app/api/lms/materials/[materialId]/download/route';

const materialKey =
  'lms/teacher_1/materials/course/course_1/12345678-handout.pdf';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method,
  });
}

describe('course material APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireLmsRole.mockResolvedValue({ id: 'teacher_1', role: 'TEACHER' });
    mockRequireLmsUser.mockResolvedValue({ id: 'student_1', role: 'STUDENT' });
    mockCourseFindFirst.mockResolvedValue({ id: 'course_1' });
    mockVerifyR2ObjectExists.mockResolvedValue(2_048);
    mockDeleteR2Object.mockResolvedValue(undefined);
    mockGetPresignedDownloadUrl.mockResolvedValue(
      'https://account.r2.cloudflarestorage.com/signed-download',
    );
  });

  it('verifies the R2 object before saving course metadata', async () => {
    mockMaterialCreate.mockResolvedValue({
      courseId: 'course_1',
      fileSize: 2_048,
      fileType: 'PDF',
      fileUrl: `https://media.example.com/${materialKey}`,
      id: 'material_1',
      lessonId: null,
      objectKey: materialKey,
      title: 'Handout.pdf',
    });

    const response = await createMaterial(
      jsonRequest('http://localhost:3000/api/lms/materials', 'POST', {
        courseId: 'course_1',
        fileSize: 2_048,
        fileType: 'PDF',
        objectKey: materialKey,
        title: 'Handout.pdf',
      }),
    );

    expect(response.status).toBe(201);
    expect(mockVerifyR2ObjectExists).toHaveBeenCalledWith(materialKey);
    expect(mockMaterialCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: 'course_1',
        fileSize: 2_048,
        objectKey: materialKey,
      }),
    });
  });

  it('rejects an object key belonging to another user', async () => {
    const response = await createMaterial(
      jsonRequest('http://localhost:3000/api/lms/materials', 'POST', {
        courseId: 'course_1',
        fileSize: 2_048,
        fileType: 'PDF',
        objectKey:
          'lms/other_teacher/materials/course/course_1/12345678-handout.pdf',
        title: 'Handout.pdf',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockVerifyR2ObjectExists).not.toHaveBeenCalled();
  });

  it('deletes the R2 object before removing its database record', async () => {
    mockMaterialFindUnique.mockResolvedValue({
      course: { id: 'course_1', teacherId: 'teacher_1' },
      id: 'material_1',
      isDownloadable: true,
      lesson: null,
      objectKey: materialKey,
    });
    mockMaterialDelete.mockResolvedValue({ id: 'material_1' });

    const response = await deleteMaterial(
      jsonRequest(
        'http://localhost:3000/api/lms/materials/material_1',
        'DELETE',
      ),
      { params: Promise.resolve({ materialId: 'material_1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockDeleteR2Object).toHaveBeenCalledWith(materialKey);
    expect(mockMaterialDelete).toHaveBeenCalledWith({
      where: { id: 'material_1' },
    });
  });

  it('issues an enrolled student a short-lived download redirect', async () => {
    mockMaterialFindUnique.mockResolvedValue({
      course: {
        enrollments: [{ id: 'enrollment_1' }],
        id: 'course_1',
        isPublished: true,
        teacherId: 'teacher_1',
      },
      id: 'material_1',
      isDownloadable: true,
      lesson: null,
      objectKey: materialKey,
      title: 'Handout.pdf',
    });

    const response = await downloadMaterial(
      new Request(
        'http://localhost:3000/api/lms/materials/material_1/download',
      ),
      { params: Promise.resolve({ materialId: 'material_1' }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://account.r2.cloudflarestorage.com/signed-download',
    );
    expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith(
      materialKey,
      300,
      'Handout.pdf',
    );
  });
});
