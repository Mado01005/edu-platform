import Link from 'next/link';
import type { User } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  PlayCircle,
  Radio,
} from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { getPrisma } from '@/lib/prisma';

export async function StudentLmsDashboard({
  notice,
  user,
}: {
  notice?: string;
  user: User;
}) {
  const now = new Date();
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
        startTime: { gte: now },
        course: { enrollments: { some: { studentId: user.id } } },
      },
      include: { course: { select: { title: true } } },
      orderBy: { startTime: 'asc' },
      take: 4,
    }),
  ]);
  const progressByCourse = new Map(
    enrollments.map(({ course }) => {
      const lessons = course.modules.flatMap((module) => module.lessons);
      const completed = lessons.filter(
        (lesson) => lesson.progress[0]?.isCompleted,
      ).length;
      return [
        course.id,
        {
          completed,
          firstIncomplete: lessons.find(
            (lesson) => !lesson.progress[0]?.isCompleted,
          ),
          lessons,
        },
      ] as const;
    }),
  );
  const urgentLiveClass = liveClasses.find(
    (session) => session.startTime.getTime() <= now.getTime() + 60 * 60 * 1000,
  );
  const resumableCourse = enrollments
    .map(({ course }) => ({ course, progress: progressByCourse.get(course.id)! }))
    .find(
      ({ progress }) =>
        progress.completed > 0 &&
        progress.completed < progress.lessons.length &&
        progress.firstIncomplete,
    );

  return (
    <PortalShell user={user}>
        {notice ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
            role="status"
          >
            {notice}
          </div>
        ) : null}
        <header className="py-2 sm:py-3">
          <h1 className="break-words text-4xl font-bold tracking-tight text-slate-900">
            Welcome back, {user.name?.split(' ')[0] ?? 'learner'}.
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Pick up where you left off or join your next live class.
          </p>
        </header>
        {urgentLiveClass ? (
          <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Radio aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                What to do next · Starting within one hour
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">
                {urgentLiveClass.title}
              </h2>
              <p className="mt-1 truncate text-xs text-slate-500">
                {urgentLiveClass.course.title}
              </p>
            </div>
            <a
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              href={urgentLiveClass.meetingUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Radio aria-hidden="true" className="size-4" />
              Join Live Zoom Class Now
            </a>
          </section>
        ) : resumableCourse?.progress.firstIncomplete ? (
          <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <PlayCircle aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                What to do next · Continue learning
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">
                {resumableCourse.progress.firstIncomplete.title}
              </h2>
              <p className="mt-1 truncate text-xs text-slate-500">
                {resumableCourse.course.title}
              </p>
            </div>
            <Link
              className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              href={`/courses/${resumableCourse.course.id}/learn/lessons/${resumableCourse.progress.firstIncomplete.id}`}
            >
              <PlayCircle aria-hidden="true" className="size-4" />
              Resume Lesson: {resumableCourse.progress.firstIncomplete.title}
            </Link>
          </section>
        ) : null}
        <section className="min-w-0">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-sky-600" />
              <h2 className="text-xl font-semibold text-slate-900">Enrolled courses</h2>
            </div>
            <Link className="shrink-0 text-sm font-semibold text-sky-700 hover:text-sky-800" href="/catalog">
              Browse catalog
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {enrollments.map(({ course }) => {
              const { completed, firstIncomplete, lessons } =
                progressByCourse.get(course.id)!;
              const percentage = lessons.length
                ? Math.round((completed / lessons.length) * 100)
                : 0;
              const nextLesson = firstIncomplete ?? lessons[0];

              return (
                <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={course.id}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {completed}/{lessons.length} lessons complete
                  </p>
                  <h3 className="mt-2 break-words text-xl font-semibold text-slate-900">{course.title}</h3>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{percentage}%</span>
                  </div>
                  {nextLesson ? (
                    <Link
                      className="mt-5 flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                      href={`/courses/${course.id}/learn/lessons/${nextLesson.id}`}
                    >
                      Continue course <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!enrollments.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">You are not enrolled in a course yet.</p>
              <Link className="mt-4 inline-block rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700" href="/catalog">
                Explore courses
              </Link>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="size-5 text-sky-600" />
            <h2 className="text-xl font-semibold text-slate-900">Upcoming live classes</h2>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            {liveClasses.map((session) => (
              <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center" key={session.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-sky-700">
                    {session.course.title}
                  </p>
                  <p className="mt-1 break-words font-semibold text-slate-900">{session.title}</p>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
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
                <a className="shrink-0 rounded-xl border border-sky-300 bg-white px-4 py-2 text-center text-sm font-semibold text-sky-700 hover:bg-sky-50" href={session.meetingUrl} rel="noopener noreferrer" target="_blank">
                  Join
                </a>
              </div>
            ))}
            {!liveClasses.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No upcoming classes.
              </p>
            ) : null}
          </div>
        </section>
    </PortalShell>
  );
}
