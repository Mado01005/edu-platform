import Link from 'next/link';
import { Eye } from 'lucide-react';
import { notFound } from 'next/navigation';
import { CourseEditor } from '@/components/teacher/course-editor';
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

export default async function TeacherCourseEditorPage({ params }: { params: Promise<{ courseId: string }> }) {
  const [{ courseId }, teacher] = await Promise.all([params, requireTeacherPage()]);
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
    <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
      <header className="sticky top-16 z-30 flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-zinc-950/95 p-4 backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Teacher Studio</p>
          <h1 className="mt-1 truncate text-2xl font-black">{course.title}</h1>
        </div>
        <Link className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black" href={`/courses/${encodeURIComponent(course.slug)}?preview=true`} rel="noopener noreferrer" target="_blank">
          <Eye className="size-4" /> Preview as Student
        </Link>
      </header>
      <CourseEditor course={{
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
    </div>
  );
}
