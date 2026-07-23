const mockRequireLmsRole = jest.fn();
const mockGetPresignedUploadUrl = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockLessonFindFirst = jest.fn();

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
    lesson: { findFirst: mockLessonFindFirst },
  }),
}));

import { POST as createPresignedUpload } from '@/app/api/upload/r2/route';
import { getVideoEmbedUrl } from '@/lib/lms/video';

function uploadRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/upload/r2', {
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
      900,
    );
    expect(body.requiredHeaders).toEqual({ 'Content-Type': 'video/mp4' });
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
