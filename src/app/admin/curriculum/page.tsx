import { CurriculumBulkManager } from '@/app/admin/curriculum/CurriculumBulkManager';
import { PortalShell } from '@/components/erp/PortalShell';
import { SubjectCreateForm } from '@/components/Admin/subject-create-form';
import { CourseCreateForm } from '@/components/teacher/course-create-form';
import { requireAdminPage } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
        gradeLevel: true,
        id: true,
        modules: {
          orderBy: { position: 'asc' },
          select: {
            _count: { select: { lessons: true } },
            id: true,
            title: true,
          },
        },
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
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create content in order: Grade Level → Subject → Course → Module →
          Add Lesson.
        </p>
      </header>

      <section className="flex min-w-0 flex-col gap-4">
        <SubjectCreateForm />
        <CourseCreateForm requireSubject subjects={subjects} />
      </section>

      <CurriculumBulkManager
        courses={courses.map((course) => ({
          gradeLevel: course.gradeLevel,
          id: course.id,
          modules: course.modules.map((courseModule) => ({
            id: courseModule.id,
            lessonCount: courseModule._count.lessons,
            title: courseModule.title,
          })),
          subjectName: course.subject?.name ?? null,
          title: course.title,
        }))}
        subjects={subjects}
      />
    </PortalShell>
  );
}
