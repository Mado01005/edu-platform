import type { ContentType } from '@prisma/client';
import {
  formatLessonPlayerHeading,
  getCoursePlayerBreadcrumbs,
  mergeCoursePlayerMaterials,
  resolvePrimaryLessonContent,
  type CoursePlayerMaterial,
} from '@/lib/lms/course-player';

const pdfMaterial: CoursePlayerMaterial = {
  fileSize: 1_186_504,
  fileType: 'PDF',
  fileUrl: 'https://media.example.com/chapter-2.pdf',
  id: 'pdf-1',
  title: 'Chapter 2.pdf',
};

function resolve(
  overrides: Partial<Parameters<typeof resolvePrimaryLessonContent>[0]> = {},
) {
  return resolvePrimaryLessonContent({
    contentType: 'TEXT' as ContentType,
    lessonTitle: 'Addition',
    materials: [],
    ...overrides,
  });
}

describe('course player primary content', () => {
  it('keeps video primary when a video and documents are available', () => {
    expect(
      resolve({
        contentType: 'R2_VIDEO',
        materials: [pdfMaterial],
        videoUrl: 'https://media.example.com/lesson.mp4',
      }),
    ).toEqual({
      kind: 'video',
      type: 'R2_VIDEO',
      url: 'https://media.example.com/lesson.mp4',
    });
  });

  it('recognizes a quality-only R2 source as video', () => {
    expect(
      resolve({
        contentType: 'R2_VIDEO',
        qualitySources: {
          '720p': 'https://media.example.com/lesson-720.mp4',
        },
      }),
    ).toMatchObject({ kind: 'video', url: expect.stringContaining('720') });
  });

  it('prefers a populated video URL even when legacy content metadata is stale', () => {
    expect(
      resolve({
        contentType: 'PDF',
        materials: [pdfMaterial],
        videoUrl: 'https://media.example.com/legacy-video.mp4',
      }),
    ).toEqual({
      kind: 'video',
      type: 'R2_VIDEO',
      url: 'https://media.example.com/legacy-video.mp4',
    });
  });

  it.each([
    ['https://youtu.be/abc123def45', 'YOUTUBE'],
    ['https://vimeo.com/123456789', 'VIMEO'],
  ])('infers %s URLs when legacy content metadata is stale', (videoUrl, type) => {
    expect(
      resolve({ contentType: 'PDF', materials: [pdfMaterial], videoUrl }),
    ).toMatchObject({ kind: 'video', type });
  });

  it('ignores an unsafe video URL and falls back to an embeddable document', () => {
    expect(
      resolve({
        contentType: 'R2_VIDEO',
        materials: [pdfMaterial],
        videoUrl: 'http://media.example.com/unsafe.mp4',
      }),
    ).toMatchObject({ kind: 'document', title: 'Chapter 2.pdf' });
  });

  it('uses a valid quality source when the main video URL is unsafe', () => {
    expect(
      resolve({
        contentType: 'R2_VIDEO',
        materials: [pdfMaterial],
        qualitySources: {
          '720p': 'https://media.example.com/lesson-720.mp4',
        },
        videoUrl: 'http://media.example.com/unsafe.mp4',
      }),
    ).toMatchObject({ kind: 'video', url: expect.stringContaining('720') });
  });

  it('uses a direct lesson PDF before material attachments', () => {
    expect(
      resolve({
        contentType: 'PDF',
        materials: [pdfMaterial],
        pdfUrl: 'https://media.example.com/direct.pdf',
      }),
    ).toEqual({
      fileType: 'PDF',
      isDownloadable: false,
      kind: 'document',
      title: 'Addition resource',
      url: 'https://media.example.com/direct.pdf',
    });
  });

  it('ignores an invalid direct PDF and falls back to an attachment', () => {
    expect(
      resolve({
        contentType: 'PDF',
        materials: [pdfMaterial],
        pdfUrl: 'not-a-url',
      }),
    ).toMatchObject({ kind: 'document', title: 'Chapter 2.pdf' });
  });

  it('skips an unsafe attachment in favor of the next valid document', () => {
    expect(
      resolve({
        contentType: 'PDF',
        materials: [
          { ...pdfMaterial, fileUrl: 'http://media.example.com/unsafe.pdf' },
          { ...pdfMaterial, id: 'pdf-2', title: 'Safe.pdf' },
        ],
      }),
    ).toMatchObject({ kind: 'document', title: 'Safe.pdf' });
  });

  it.each(['PDF', 'DOCX', 'SLIDES', 'WORKSHEET'])(
    'uses the first %s module or lesson attachment when video is absent',
    (fileType) => {
      expect(
        resolve({
          contentType: 'PDF',
          materials: [{ ...pdfMaterial, fileType }],
        }),
      ).toMatchObject({ fileType, kind: 'document', title: 'Chapter 2.pdf' });
    },
  );

  it('falls back to the minimal notes banner when no media is embeddable', () => {
    expect(
      resolve({
        materials: [{ ...pdfMaterial, fileType: 'ZIP' }],
      }),
    ).toEqual({ kind: 'notes' });
  });
});

describe('course player presentation data', () => {
  it('builds the exact three-part breadcrumb trail with a slug course link', () => {
    expect(
      getCoursePlayerBreadcrumbs({
        courseSlug: 'math-8-pnt0',
        courseTitle: 'Math 8',
        lessonTitle: 'Addition',
      }),
    ).toEqual([
      { href: '/catalog', label: 'Catalog' },
      { href: '/courses/math-8-pnt0', label: 'Math 8' },
      { label: 'Addition' },
    ]);
  });

  it('keeps preview mode on the course breadcrumb', () => {
    expect(
      getCoursePlayerBreadcrumbs({
        courseSlug: 'math-8-pnt0',
        courseTitle: 'Math 8',
        lessonTitle: 'Addition',
        preview: true,
      })[1],
    ).toEqual({
      href: '/courses/math-8-pnt0?preview=true',
      label: 'Math 8',
    });
  });

  it('formats one compact course, chapter, and lesson heading', () => {
    expect(formatLessonPlayerHeading('Math 8', 'Chapter 1', 'Addition')).toBe(
      'Math 8 · Chapter 1: Addition',
    );
  });

  it('merges attachment scopes without duplicate cards', () => {
    expect(
      mergeCoursePlayerMaterials(
        [pdfMaterial],
        [pdfMaterial, { ...pdfMaterial, id: 'pdf-2', title: 'Homework.pdf' }],
      ).map((material) => material.title),
    ).toEqual(['Chapter 2.pdf', 'Homework.pdf']);
  });
});
