import type { ContentType, GradeLevel } from '@prisma/client';
import type { TeacherMaterial } from '@/components/teacher/material-uploader';

export type TeacherAssignment = {
  dueAt: string | null;
  id: string;
  instructions: string | null;
  questionCount: number;
  type: 'QUIZ' | 'HOMEWORK';
};

export type TeacherLesson = {
  assignment: TeacherAssignment | null;
  contentType: ContentType;
  durationMin: number | null;
  id: string;
  isFree: boolean;
  materials: TeacherMaterial[];
  pdfUrl: string | null;
  position: number;
  textContent: string | null;
  title: string;
  videoUrl: string | null;
};

export type TeacherModule = {
  id: string;
  lessons: TeacherLesson[];
  materials: TeacherMaterial[];
  position: number;
  title: string;
};

export type TeacherCourse = {
  description: string | null;
  gradeLevel: GradeLevel | null;
  id: string;
  imageUrl: string | null;
  isPublished: boolean;
  materials: TeacherMaterial[];
  modules: TeacherModule[];
  priceEGP: string;
  priceUSD: string;
  slug: string;
  title: string;
  zoomSessions: {
    duration: number;
    id: string;
    meetingUrl: string;
    startTime: string;
    title: string;
  }[];
};
