import Link from 'next/link';
import { ArrowRight, BookOpen, Search, Users } from 'lucide-react';
import { enrollCourseAction } from '@/app/lms/actions';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { getLmsUser } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, user] = await Promise.all([searchParams, getLmsUser()]);
  const query = q?.trim().slice(0, 100) ?? '';
  const courses = await getPrisma().course.findMany({
    where: {
      isPublished: true,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      teacher: { select: { name: true } },
      modules: {
        select: { _count: { select: { lessons: true } } },
      },
      enrollments: user
        ? { where: { studentId: user.id }, select: { id: true } }
        : false,
      _count: { select: { enrollments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <LmsHeader />
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-10">
        <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.22),transparent_50%)] p-6 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">
            Learn at your pace
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
            Courses built for real progress.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
            Structured lessons, downloadable resources, live classes, and one
            clear place to track what you have completed.
          </p>
        </section>

        <form className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950 p-2">
          <Search className="ml-2 size-4 shrink-0 text-zinc-500" />
          <input
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            defaultValue={query}
            name="q"
            placeholder="Search courses"
          />
          <button className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-black text-black">
            Search
          </button>
        </form>

        <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const lessonCount = course.modules.reduce(
              (sum, module) => sum + module._count.lessons,
              0,
            );
            const enrolled =
              'enrollments' in course && course.enrollments.length > 0;
            const enroll = enrollCourseAction.bind(null, course.id);

            return (
              <article
                className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
                key={course.id}
              >
                <div
                  className="aspect-[16/9] bg-cover bg-center"
                  style={
                    course.imageUrl
                      ? { backgroundImage: `url(${course.imageUrl})` }
                      : {
                          backgroundImage:
                            'radial-gradient(circle at 30% 20%, rgba(167,139,250,.6), transparent 35%), linear-gradient(135deg,#18181b,#09090b)',
                        }
                  }
                />
                <div className="flex min-w-0 flex-1 flex-col p-5">
                  <p className="text-xs font-bold text-violet-300">
                    {course.teacher.name ?? 'EduPortal teacher'}
                  </p>
                  <h2 className="mt-2 break-words text-xl font-black">{course.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {course.description ?? 'A structured course with practical lessons.'}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="size-3" /> {lessonCount} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" /> {course._count.enrollments}
                    </span>
                  </div>
                  <div className="mt-auto pt-5">
                    {user?.role === 'STUDENT' ? (
                      <form action={enroll}>
                        <ActionSubmitButton
                          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black hover:bg-violet-300"
                          pendingLabel={enrolled ? 'Opening…' : 'Enrolling…'}
                        >
                          {enrolled ? 'Continue learning' : 'Enroll now'}
                          <ArrowRight className="size-4" />
                        </ActionSubmitButton>
                      </form>
                    ) : user ? (
                      <Link
                        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-white"
                        href={user.role === 'ADMIN' || user.role === 'TEACHER' ? '/teacher/courses' : '/dashboard'}
                      >
                        Open your workspace <ArrowRight className="size-4" />
                      </Link>
                    ) : (
                      <Link
                        className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black"
                        href={`/lms/login?next=${encodeURIComponent('/catalog')}`}
                      >
                        Sign in to enroll <ArrowRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {!courses.length ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-zinc-500">
            No published courses match this search.
          </div>
        ) : null}
      </main>
    </div>
  );
}
