import type { ContentType, GradeLevel } from '@prisma/client';
import type { TeacherMaterial } from '@/components/teacher/material-uploader';

export type TeacherAssignment = {
  dueAt: string | null;
  durationMin: number;
  id: string;
  instructions: string | null;
  maxAttempts: number;
  questionCount: number;
  questions: {
    correctOptionKey: string;
    diagramUrl: string | null;
    id: string;
    options: { key: string; text: string }[];
    prompt: string;
    workedSolution: string;
  }[];
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
  videoUrl360: string | null;
  videoUrl480: string | null;
  videoUrl720: string | null;
  videoUrl1080: string | null;
};

export type TeacherModule = {
  id: string;
  lessons: TeacherLesson[];
  materials: TeacherMaterial[];
  position: number;
  standalonePriceEGP: string;
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
