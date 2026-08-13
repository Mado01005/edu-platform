import type { ContentType } from '@prisma/client';
import { getVideoEmbedUrl } from '@/lib/lms/video';

export type CoursePlayerMaterial = {
  fileSize: number | null;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
};

export type CoursePlayerBreadcrumb = {
  href?: string;
  label: string;
};

type VideoQualitySources = {
  '1080p'?: string | null;
  '360p'?: string | null;
  '480p'?: string | null;
  '720p'?: string | null;
};

type LessonVideoSources = {
  contentType: ContentType;
  qualitySources?: VideoQualitySources;
  videoUrl?: string | null;
};

export type PrimaryLessonContent =
  | {
      kind: 'document';
      fileType: string;
      title: string;
      url: string;
    }
  | {
      kind: 'notes';
    }
  | {
      kind: 'video';
      type: 'R2_VIDEO' | 'VIMEO' | 'YOUTUBE';
      url: string;
    };

const EMBEDDABLE_DOCUMENT_TYPES = new Set([
  'DOC',
  'DOCX',
  'PDF',
  'PPT',
  'PPTX',
  'SLIDES',
  'WORKSHEET',
  'XLS',
  'XLSX',
]);

function safeHttpsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function inferVideoType(
  contentType: ContentType,
  value: string,
): 'R2_VIDEO' | 'VIMEO' | 'YOUTUBE' {
  const hostname = new URL(value).hostname.replace(/^www\./, '');
  if (
    hostname === 'youtu.be' ||
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'youtube-nocookie.com'
  ) {
    return 'YOUTUBE';
  }
  if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
    return 'VIMEO';
  }
  if (
    (contentType === 'YOUTUBE' || contentType === 'VIMEO') &&
    getVideoEmbedUrl(value, contentType)
  ) {
    return contentType;
  }
  return 'R2_VIDEO';
}

function resolveVideo(
  contentType: ContentType,
  value: string | null | undefined,
): Extract<PrimaryLessonContent, { kind: 'video' }> | null {
  const url = safeHttpsUrl(value);
  if (!url) return null;

  const type = inferVideoType(contentType, url);
  if (type !== 'R2_VIDEO' && !getVideoEmbedUrl(url, type)) return null;

  return { kind: 'video', type, url };
}

export function resolvePlayableLessonVideo({
  contentType,
  qualitySources = {},
  videoUrl,
}: LessonVideoSources): Extract<PrimaryLessonContent, { kind: 'video' }> | null {
  const directVideo = resolveVideo(contentType, videoUrl);
  if (directVideo) return directVideo;

  for (const qualitySource of [
    qualitySources['1080p'],
    qualitySources['720p'],
    qualitySources['480p'],
    qualitySources['360p'],
  ]) {
    const qualityVideo = resolveVideo('R2_VIDEO', qualitySource);
    if (qualityVideo) return qualityVideo;
  }

  return null;
}

function isEmbeddableDocument(fileType: string) {
  return EMBEDDABLE_DOCUMENT_TYPES.has(fileType.trim().toUpperCase());
}

export function mergeCoursePlayerMaterials(
  ...groups: readonly (readonly CoursePlayerMaterial[])[]
) {
  const seen = new Set<string>();
  const merged: CoursePlayerMaterial[] = [];

  for (const group of groups) {
    for (const material of group) {
      if (seen.has(material.id)) continue;
      seen.add(material.id);
      merged.push(material);
    }
  }

  return merged;
}

export function resolvePrimaryLessonContent({
  contentType,
  lessonTitle,
  materials,
  pdfUrl,
  qualitySources = {},
  videoUrl,
}: {
  contentType: ContentType;
  lessonTitle: string;
  materials: readonly CoursePlayerMaterial[];
  pdfUrl?: string | null;
  qualitySources?: VideoQualitySources;
  videoUrl?: string | null;
}): PrimaryLessonContent {
  const playableVideo = resolvePlayableLessonVideo({
    contentType,
    qualitySources,
    videoUrl,
  });
  if (playableVideo) return playableVideo;

  const directPdfUrl = safeHttpsUrl(pdfUrl);
  if (directPdfUrl) {
    return {
      fileType: 'PDF',
      kind: 'document',
      title: `${lessonTitle} resource`,
      url: directPdfUrl,
    };
  }

  const document = materials.find((material) =>
    isEmbeddableDocument(material.fileType) && safeHttpsUrl(material.fileUrl),
  );
  const documentUrl = document ? safeHttpsUrl(document.fileUrl) : null;
  if (document && documentUrl) {
    return {
      fileType: document.fileType,
      kind: 'document',
      title: document.title,
      url: documentUrl,
    };
  }

  return { kind: 'notes' };
}

export function getCoursePlayerBreadcrumbs({
  courseSlug,
  courseTitle,
  lessonTitle,
  preview = false,
}: {
  courseSlug: string;
  courseTitle: string;
  lessonTitle: string;
  preview?: boolean;
}): CoursePlayerBreadcrumb[] {
  return [
    { href: '/catalog', label: 'Catalog' },
    {
      href: `/courses/${courseSlug}${preview ? '?preview=true' : ''}`,
      label: courseTitle,
    },
    { label: lessonTitle },
  ];
}

export function formatLessonPlayerHeading(
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
) {
  const normalizedModuleTitle = moduleTitle.trim().replace(/:+$/, '');
  return `${courseTitle} · ${normalizedModuleTitle}: ${lessonTitle}`;
}
