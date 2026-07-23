import { CalendarDays, Clock3, Radio, Video } from 'lucide-react';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { requireLmsPageUser } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function LiveClassesPage() {
  const user = await requireLmsPageUser();
  const sessions = await getPrisma().zoomSession.findMany({
    where: {
      startTime: { gte: new Date() },
      ...(user.role === 'ADMIN'
        ? {}
        : user.role === 'TEACHER'
          ? { teacherId: user.id }
          : { course: { enrollments: { some: { studentId: user.id } } } }),
    },
    include: {
      course: { select: { title: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <LmsHeader />
      <main className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 px-4 py-10">
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.18),transparent_45%)] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            <Radio className="size-4" /> Live learning
          </div>
          <h1 className="mt-3 text-4xl font-black">Upcoming classes</h1>
          <p className="mt-3 text-sm text-zinc-400">
            All times are shown in your device&apos;s local timezone.
          </p>
        </header>

        <section className="flex min-w-0 flex-col gap-3">
          {sessions.map((session) => (
            <article
              className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-5 sm:flex-row sm:items-center"
              key={session.id}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-black">
                <Video className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase tracking-wider text-emerald-300">
                  {session.course.title}
                </p>
                <h2 className="mt-1 break-words text-lg font-black">{session.title}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    <LocalDateTime date={session.startTime} />
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {session.duration} min
                  </span>
                </div>
              </div>
              <a
                className="shrink-0 rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black hover:bg-emerald-200"
                href={session.meetingUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Join meeting
              </a>
            </article>
          ))}
        </section>

        {!sessions.length ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
            No live classes are scheduled yet.
          </div>
        ) : null}
      </main>
    </div>
  );
}
