import Link from 'next/link';
import type { User } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Radio,
} from 'lucide-react';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { getPrisma } from '@/lib/prisma';

export async function StudentLmsDashboard({ user }: { user: User }) {
  const [enrollments, liveClasses] = await Promise.all([
    getPrisma().enrollment.findMany({
      where: { studentId: user.id },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  orderBy: { position: 'asc' },
                  include: {
                    progress: {
                      where: { studentId: user.id },
                      select: { isCompleted: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getPrisma().zoomSession.findMany({
      where: {
        startTime: { gte: new Date() },
        course: { enrollments: { some: { studentId: user.id } } },
      },
      include: { course: { select: { title: true } } },
      orderBy: { startTime: 'asc' },
      take: 4,
    }),
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <LmsHeader user={user} />
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-10">
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.2),transparent_50%)] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
            Student dashboard
          </p>
          <h1 className="mt-3 break-words text-4xl font-black">
            Welcome back, {user.name?.split(' ')[0] ?? 'learner'}.
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Pick up where you left off or join your next live class.
          </p>
        </header>

        <section className="min-w-0">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-violet-300" />
              <h2 className="text-xl font-black">Enrolled courses</h2>
            </div>
            <Link className="shrink-0 text-sm font-bold text-violet-300" href="/catalog">
              Browse catalog
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {enrollments.map(({ course }) => {
              const lessons = course.modules.flatMap((module) => module.lessons);
              const completed = lessons.filter(
                (lesson) => lesson.progress[0]?.isCompleted,
              ).length;
              const percentage = lessons.length
                ? Math.round((completed / lessons.length) * 100)
                : 0;
              const firstIncomplete =
                lessons.find((lesson) => !lesson.progress[0]?.isCompleted) ??
                lessons[0];

              return (
                <article className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-zinc-950 p-5" key={course.id}>
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    {completed}/{lessons.length} lessons complete
                  </p>
                  <h3 className="mt-2 break-words text-xl font-black">{course.title}</h3>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>Progress</span>
                    <span>{percentage}%</span>
                  </div>
                  {firstIncomplete ? (
                    <Link
                      className="mt-5 flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black"
                      href={`/courses/${course.id}/learn/lessons/${firstIncomplete.id}`}
                    >
                      Continue course <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!enrollments.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="text-sm text-zinc-500">You are not enrolled in a course yet.</p>
              <Link className="mt-4 inline-block rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black" href="/catalog">
                Explore courses
              </Link>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="size-5 text-emerald-300" />
            <h2 className="text-xl font-black">Upcoming live classes</h2>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            {liveClasses.map((session) => (
              <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-black p-4 sm:flex-row sm:items-center" key={session.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-emerald-300">
                    {session.course.title}
                  </p>
                  <p className="mt-1 break-words font-black">{session.title}</p>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />{' '}
                      <LocalDateTime date={session.startTime} dateOnly />
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" />{' '}
                      <LocalDateTime date={session.startTime} timeOnly />
                    </span>
                  </p>
                </div>
                <a className="shrink-0 rounded-xl bg-emerald-300 px-4 py-2 text-center text-sm font-black text-black" href={session.meetingUrl} rel="noopener noreferrer" target="_blank">
                  Join
                </a>
              </div>
            ))}
            {!liveClasses.length ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No upcoming classes.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
