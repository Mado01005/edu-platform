import { notFound } from 'next/navigation';
import { CourseBuilder } from '@/components/lms/CourseBuilder';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const [{ courseId }, teacher] = await Promise.all([
    params,
    requireTeacherPage(),
  ]);
  const course = await getPrisma().course.findFirst({
    where: {
      id: courseId,
      ...(isAdminRole(teacher.role) ? {} : { teacherId: teacher.id }),
    },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: { lessons: { orderBy: { position: 'asc' } } },
      },
      zoomSessions: { orderBy: { startTime: 'asc' } },
    },
  });

  if (!course) notFound();

  return (
    <>
      <header className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
          Course builder
        </p>
        <h1 className="mt-2 break-words text-2xl font-black">{course.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Changes to lessons are saved per card.
        </p>
      </header>
      <CourseBuilder
        course={{
          ...course,
          priceEGP: course.priceEGP.toFixed(2),
          priceUSD: course.priceUSD.toFixed(2),
          zoomSessions: course.zoomSessions.map((session) => ({
            ...session,
            startTime: session.startTime.toISOString(),
          })),
        }}
      />
    </>
  );
}
