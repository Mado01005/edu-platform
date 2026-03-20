import fs from 'fs';
import path from 'path';

const METADATA_PATH = path.join(process.cwd(), 'src', 'data', 'content-metadata.json');

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
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const rawData = fs.readFileSync(METADATA_PATH, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error('Error loading metadata manifest:', error);
  }
  return [];
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
