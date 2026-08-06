import { notFound } from 'next/navigation';
import {
  CourseEditor,
  type CourseEditorTab,
} from '@/components/teacher/course-editor';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const materialSelect = {
  fileSize: true,
  fileType: true,
  fileUrl: true,
  id: true,
  title: true,
} as const;

function editorTab(value: string | undefined): CourseEditorTab {
  return ['curriculum', 'details', 'resources', 'zoom'].includes(value ?? '')
    ? (value as CourseEditorTab)
    : 'details';
}

export default async function TeacherCourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ courseId }, query, teacher] = await Promise.all([
    params,
    searchParams,
    requireTeacherPage(),
  ]);
  const course = await getPrisma().course.findFirst({
    where: { id: courseId, ...(isAdminRole(teacher.role) ? {} : { teacherId: teacher.id }) },
    include: {
      materials: { orderBy: { createdAt: 'desc' }, select: materialSelect },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          materials: { orderBy: { createdAt: 'desc' }, select: materialSelect },
          lessons: {
            orderBy: { position: 'asc' },
            include: {
              assignment: true,
              materials: { orderBy: { createdAt: 'desc' }, select: materialSelect },
            },
          },
        },
      },
      zoomSessions: { where: { startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' } },
    },
  });
  if (!course) notFound();

  return (
    <CourseEditor initialTab={editorTab(query.tab)} course={{
        ...course,
        priceEGP: course.priceEGP.toFixed(2),
        priceUSD: course.priceUSD.toFixed(2),
        modules: course.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            assignment: lesson.assignment ? { ...lesson.assignment, dueAt: lesson.assignment.dueAt?.toISOString() ?? null } : null,
          })),
        })),
        zoomSessions: course.zoomSessions.map((session) => ({ ...session, startTime: session.startTime.toISOString() })),
      }} />
  );
}
