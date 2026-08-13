import Link from 'next/link';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { SubjectCreateForm } from '@/components/Admin/subject-create-form';
import { CourseCreateForm } from '@/components/teacher/course-create-form';
import { requireAdminPage } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function gradeLabel(grade: string) {
  return `Grade ${grade.replace('GRADE_', '')}`;
}

export default async function CurriculumPage() {
  const admin = await requireAdminPage();
  const [subjects, courses] = await Promise.all([
    getPrisma().subject.findMany({
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      select: { grade: true, id: true, name: true },
    }),
    getPrisma().course.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        _count: { select: { modules: true } },
        gradeLevel: true,
        id: true,
        subject: { select: { name: true } },
        title: true,
      },
    }),
  ]);

  return (
    <PortalShell user={admin}>
      <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
          Academic content
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Course &amp; Lesson Manager
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create content in a clear order: Grade Level → Subject → Course →
          Module → Add Lesson.
        </p>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SubjectCreateForm />
        <CourseCreateForm requireSubject subjects={subjects} />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpenCheck className="size-5 text-sky-700" aria-hidden="true" />
            Subjects
          </h2>
          {subjects.length ? (
            <ul className="mt-4 flex flex-col gap-2">
              {subjects.map((subject) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm"
                  key={subject.id}
                >
                  <span className="font-semibold text-slate-900">
                    {subject.name}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {gradeLabel(subject.grade)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
              No subjects created yet. Click &apos;Create New Subject&apos; to
              get started.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
          <h2 className="text-lg font-bold text-slate-900">Courses</h2>
          {courses.length ? (
            <ul className="mt-4 flex flex-col gap-2">
              {courses.map((course) => (
                <li key={course.id}>
                  <Link
                    className="card-hover group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm shadow-sm shadow-slate-200/50"
                    href={`/teacher/courses/${course.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">
                        {course.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {course.gradeLevel
                          ? gradeLabel(course.gradeLevel)
                          : 'No grade'}{' '}
                        · {course.subject?.name ?? 'No subject'} ·{' '}
                        {course._count.modules} modules
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">
              No courses created yet. Click &apos;Create Course&apos; to get
              started.
            </p>
          )}
        </div>
      </section>
    </PortalShell>
  );
}
