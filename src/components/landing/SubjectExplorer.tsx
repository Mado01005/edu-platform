import { CurriculumExplorer } from '@/components/landing/CurriculumExplorer';

export type LandingCourse = {
  chapterCount: number;
  grade: '1st Sec' | '2nd Sec' | '3rd Sec';
  id: string;
  instructorAvatar: string | null;
  instructorName: string;
  previewLessonId: string | null;
  subject: 'Physics' | 'Pure Mathematics' | 'Mechanics' | 'Chemistry' | 'Biology';
  title: string;
};

export function SubjectExplorer(_props: { courses?: LandingCourse[] }) {
  return <CurriculumExplorer />;
}
