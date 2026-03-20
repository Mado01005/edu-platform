import subjectsMetadata from '../data/content-metadata.json';

export interface ContentNode {
  type: 'file' | 'folder' | 'vimeo';
  fileType?: 'video' | 'pdf' | 'image' | 'unknown'; 
  name: string;
  url?: string;
  vimeoId?: string;
  children?: ContentNode[];
}

export interface LessonMeta {
  slug: string;
  title: string;
  subjectSlug: string;
  content: ContentNode[];
  hasVideo: boolean;
  hasPdf: boolean;
  imageCount: number;
}

export interface SubjectMeta {
  slug: string;
  title: string;
  lessons: LessonMeta[];
  icon: string;
  color: string;
}

export function getAllSubjects(): SubjectMeta[] {
  return subjectsMetadata as SubjectMeta[];
}

export function getSubject(slug: string): SubjectMeta | null {
  const subjects = getAllSubjects();
  return subjects.find((s) => s.slug === slug) || null;
}

export function getLesson(subjectSlug: string, lessonSlug: string): LessonMeta | null {
  const subject = getSubject(subjectSlug);
  if (!subject) return null;
  return subject.lessons.find((l) => l.slug === lessonSlug) || null;
}
