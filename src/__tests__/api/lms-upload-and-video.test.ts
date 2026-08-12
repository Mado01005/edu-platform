const mockRequireLmsRole = jest.fn();
const mockGetPresignedUploadUrl = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockLessonFindFirst = jest.fn();
const mockCourseFindFirst = jest.fn();
const mockModuleFindFirst = jest.fn();

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));

jest.mock('@/lib/r2', () => ({
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  getPublicUrl: mockGetPublicUrl,
}));

jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    course: { findFirst: mockCourseFindFirst },
    lesson: { findFirst: mockLessonFindFirst },
    module: { findFirst: mockModuleFindFirst },
  }),
}));

import { POST as createPresignedUpload } from '@/app/api/storage/presigned/route';
import { getVideoEmbedUrl } from '@/lib/lms/video';

function uploadRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/storage/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('LMS R2 presigned upload', () => {
  beforeEach(() => {
    mockRequireLmsRole.mockResolvedValue({
      id: 'teacher_1',
      role: 'TEACHER',
    });
    mockLessonFindFirst.mockResolvedValue({ id: 'lesson_1' });
    mockCourseFindFirst.mockResolvedValue({ id: 'course_1' });
    mockModuleFindFirst.mockResolvedValue({ id: 'module_1' });
    mockGetPresignedUploadUrl.mockResolvedValue(
      'https://account.r2.cloudflarestorage.com/signed',
    );
    mockGetPublicUrl.mockReturnValue('https://media.example.com/file.mp4');
  });

  it('rejects unauthenticated requests', async () => {
    mockRequireLmsRole.mockRejectedValue(
      new MockLmsAuthError('Authentication required.', 401),
    );
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'lecture.mp4',
        contentType: 'video/mp4',
        size: 1_024,
      }),
    );

    expect(response.status).toBe(401);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects content types outside the LMS allow-list', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'payload.html',
        contentType: 'text/html',
        size: 1_024,
      }),
    );

    expect(response.status).toBe(415);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('authorizes only the authoritative teaching roles', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'lecture.mp4',
        contentType: 'video/mp4',
        lessonId: 'lesson_1',
        size: 1_024,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockRequireLmsRole).toHaveBeenCalledWith([
      'SUPER_ADMIN',
      'ADMIN',
      'TEACHER',
    ]);
  });

  it('rejects missing or malformed upload metadata', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'lecture.mp4',
        contentType: 'video/mp4',
      }),
    );

    expect(response.status).toBe(400);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects oversized files before generating a signed URL', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'lecture.mp4',
        contentType: 'video/mp4',
        size: 500 * 1024 * 1024 + 1,
      }),
    );

    expect(response.status).toBe(413);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('enforces the 50 MiB document and image cap', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'handout.pdf',
        contentType: 'application/pdf',
        size: 50 * 1024 * 1024 + 1,
      }),
    );

    expect(response.status).toBe(413);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects an extension that does not match the declared content type', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'lecture.pdf',
        contentType: 'video/mp4',
        size: 1_024,
      }),
    );

    expect(response.status).toBe(415);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['payload.exe', 'application/octet-stream'],
    ['payload.bat', 'application/octet-stream'],
    ['payload.sh', 'application/x-sh'],
    ['payload.php', 'application/x-httpd-php'],
    ['payload.js', 'text/javascript'],
    ['payload.html', 'text/html'],
    ['payload.svg', 'image/svg+xml'],
    ['payload.exe.pdf', 'application/pdf'],
  ])('rejects executable or script file name %s', async (fileName, contentType) => {
    const response = await createPresignedUpload(
      uploadRequest({ fileName, contentType, size: 1_024 }),
    );

    expect(response.status).toBe(415);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects extensions outside the exact allow-list', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'photo.jpeg',
        contentType: 'image/jpeg',
        size: 1_024,
      }),
    );

    expect(response.status).toBe(415);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('returns a client error for malformed JSON', async () => {
    const response = await createPresignedUpload(
      new Request('http://localhost:3000/api/storage/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(400);
    expect(mockGetPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it('returns a short-lived, content-type-bound upload URL', async () => {
    const response = await createPresignedUpload(
      uploadRequest({
        fileName: 'Week 1 Lecture.mp4',
        contentType: 'video/mp4',
        size: 1_024,
        lessonId: 'lesson_1',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockLessonFindFirst).toHaveBeenCalled();
    expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^lms\/teacher_1\/lesson_1\/[a-f0-9-]+-week-1-lecture\.mp4$/,
      ),
      'video/mp4',
      300,
      1_024,
    );
    expect(body.requiredHeaders).toEqual({ 'Content-Type': 'video/mp4' });
    expect(body.expiresIn).toBe(300);
  });

  it.each([
    ['Handout.PDF', 'application/pdf', '.pdf'],
    [
      'slides.pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.pptx',
    ],
    [
      'worksheet.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.docx',
    ],
    [
      'grades.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xlsx',
    ],
    ['lecture.mp4', 'video/mp4', '.mp4'],
    ['diagram.png', 'image/png', '.png'],
    ['photo.jpg', 'image/jpeg', '.jpg'],
  ])(
    'allows the exact extension and MIME pair for %s',
    async (fileName, contentType, expectedExtension) => {
      const response = await createPresignedUpload(
        uploadRequest({
          fileName,
          contentType,
          lessonId: 'lesson_1',
          size: 1_024,
        }),
      );

      expect(response.status).toBe(200);
      const [key, signedContentType, expiresIn, contentLength] =
        mockGetPresignedUploadUrl.mock.calls.at(-1)!;
      expect(key).toMatch(
        new RegExp(
          `^lms/teacher_1/lesson_1/[a-f0-9-]+-[a-z0-9-]+\\${expectedExtension}$`,
        ),
      );
      expect(signedContentType).toBe(contentType);
      expect(expiresIn).toBe(300);
      expect(contentLength).toBe(1_024);
    },
  );

  it('allows a teacher to prepare a course material upload', async () => {
    mockGetPublicUrl.mockReturnValue(
      'https://media.example.com/lms/teacher_1/materials/course/course_1/slides.pptx',
    );
    const response = await createPresignedUpload(
      uploadRequest({
        contentType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        courseId: 'course_1',
        fileName: 'Week 1 Slides.pptx',
        size: 2_048,
        uploadKind: 'material',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockCourseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'course_1', teacherId: 'teacher_1' },
      }),
    );
    expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^lms\/teacher_1\/materials\/course\/course_1\/[a-f0-9-]+-week-1-slides\.pptx$/,
      ),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      300,
      2_048,
    );
    expect(body.fileType).toBe('SLIDES');
  });
});

describe('Universal video URL normalization', () => {
  it('normalizes common YouTube URL variants', () => {
    expect(
      getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ', 'YOUTUBE'),
    ).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(
      getVideoEmbedUrl(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'YOUTUBE',
      ),
    ).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('normalizes Vimeo links and rejects untrusted hosts', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/123456789', 'VIMEO')).toBe(
      'https://player.vimeo.com/video/123456789',
    );
    expect(
      getVideoEmbedUrl('https://example.com/watch?v=dQw4w9WgXcQ', 'YOUTUBE'),
    ).toBeNull();
    expect(
      getVideoEmbedUrl('javascript:alert(1)', 'VIMEO'),
    ).toBeNull();
  });
});
