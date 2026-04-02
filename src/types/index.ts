/**
 * CORE PLATFORM TYPES
 * Centralized hub for all database models and application-wide interfaces.
 */

export type Role = 'student' | 'teacher' | 'admin' | 'superadmin' | 'banned';
export type ItemType = 'file' | 'folder' | 'vimeo';
export type FileType = 'video' | 'pdf' | 'image' | 'powerpoint' | 'unknown';

export interface ContentNode {
  id?: string;
  type: ItemType;
  fileType?: FileType;
  name: string;
  url?: string;
  vimeoId?: string;
  children?: ContentNode[];
}

export interface Subject {
  id: string;
  slug: string;
  title: string;
  icon: string;
  color: string;
  created_at?: string;
  lessons?: unknown[]; // Replacing any with unknown
}

export interface Lesson {
  id: string;
  subject_id: string;
  slug: string;
  title: string;
  created_at?: string;
}

export interface ContentItem {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  item_type: ItemType;
  file_type: FileType | null;
  name: string;
  url: string | null;
  vimeo_id: string | null;
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  user_email: string;
  user_name: string;
  action: string;
  details: Record<string, unknown>; // Use Record instead of any
  created_at: string;
}

export interface UserRole {
  id: string;
  email: string;
  role: Role;
  is_onboarded: boolean;
  streak_count: number;
  internal_notes: string | null;
  last_login: string | null;
  created_at: string;
}

export interface LessonMeta extends Omit<Lesson, 'subject_id'> {
  subjectSlug: string;
  content: ContentNode[];
  hasVideo: boolean;
  hasPdf: boolean;
  hasDocx: boolean;
  imageCount: number;
}

export interface SubjectMeta extends Subject {
  lessons: LessonMeta[];
}

export interface StorageStats {
  supabase: {
    fileCount: number;
    estimatedMB: number;
    limitMB: number;
    percentUsed: number;
  };
  r2: {
    fileCount: number;
    estimatedMB: number;
    limitMB: number;
    percentUsed: number;
  };
  embeds: number;
  totalFiles: number;
}

export interface UploadInitiateResponse {
  signedUrl: string;
  path: string;
  publicUrl: string;
  contentType: string;
}
