import Link from 'next/link';
import { ArrowRight, CalendarPlus, Layers3 } from 'lucide-react';
import { CourseCreateForm } from '@/components/teacher/course-create-form';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherCoursesPage() {
  const teacher = await requireTeacherPage();
  const [courses, subjects] = await Promise.all([
    getPrisma().course.findMany({
      where: isAdminRole(teacher.role) ? {} : { teacherId: teacher.id },
      include: { _count: { select: { modules: true, enrollments: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    getPrisma().subject.findMany({
      where: isAdminRole(teacher.role) ? {} : { teacherId: teacher.id },
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      select: { grade: true, id: true, name: true },
    }),
  ]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
          Course workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Your courses</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Build modules, upload resources, and schedule live classes.
        </p>
      </section>

      <CourseCreateForm requireSubject subjects={subjects} />

      <section className="flex w-full min-w-0 scroll-mt-28 flex-col gap-3" id="course-list">
        {courses.length ? (
          courses.map((course) => (
            <article
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 sm:flex-row sm:items-center"
              key={course.id}
            >
              <Link
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1"
                href={`/teacher/courses/${course.id}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                  <Layers3 className="size-5 text-sky-700" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{course.title}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {course.isPublished ? 'Published' : 'Draft'} ·{' '}
                    {course._count.modules} modules · {course._count.enrollments}{' '}
                    students
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-700" />
              </Link>
              <Link
                className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-200 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
                href={`/teacher/courses/${course.id}?tab=zoom`}
              >
                <CalendarPlus aria-hidden="true" className="size-4" />
                Schedule Zoom
              </Link>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No courses created yet. Click &apos;Create Course&apos; to get started.
          </div>
        )}
      </section>
    </>
  );
}
