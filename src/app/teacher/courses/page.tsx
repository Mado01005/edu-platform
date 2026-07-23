import Link from 'next/link';
import { ArrowRight, BookPlus, Layers3 } from 'lucide-react';
import { createCourseAction } from '@/app/lms/actions';
import { Button } from '@/components/UI/button';
import { requireTeacherPage } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherCoursesPage() {
  const teacher = await requireTeacherPage();
  const courses = await getPrisma().course.findMany({
    where: teacher.role === 'ADMIN' ? {} : { teacherId: teacher.id },
    include: { _count: { select: { modules: true, enrollments: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
          Course workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Your courses</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Build modules, upload resources, and schedule live classes.
        </p>
      </section>

      <form
        action={createCourseAction}
        className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
      >
        <div className="flex items-center gap-2 text-sm font-black">
          <BookPlus className="size-4 text-violet-300" />
          Create a course
        </div>
        <input
          className="w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-violet-400"
          maxLength={200}
          name="title"
          placeholder="Course title"
          required
        />
        <textarea
          className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-violet-400"
          name="description"
          placeholder="What will students learn?"
        />
        <Button className="w-full" type="submit">
          Create course
        </Button>
      </form>

      <section className="flex w-full min-w-0 flex-col gap-3">
        {courses.length ? (
          courses.map((course) => (
            <Link
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-violet-400/50"
              href={`/teacher/courses/${course.id}/edit`}
              key={course.id}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Layers3 className="size-5 text-violet-300" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">{course.title}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">
                  {course.isPublished ? 'Published' : 'Draft'} ·{' '}
                  {course._count.modules} modules · {course._count.enrollments}{' '}
                  students
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-violet-300" />
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
            Your first course will appear here.
          </div>
        )}
      </section>
    </>
  );
}
