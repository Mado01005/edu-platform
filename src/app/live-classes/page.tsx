import { CalendarDays, Clock3, Radio, Video } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { JoinLiveClassButton } from '@/components/lms/JoinLiveClassButton';
import { requireLmsPageUser } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function LiveClassesPage() {
  const user = await requireLmsPageUser();
  const attendanceCutoff = new Date();
  attendanceCutoff.setHours(attendanceCutoff.getHours() - 9);
  const sessions = await getPrisma().zoomSession.findMany({
    where: {
      startTime: { gte: attendanceCutoff },
      ...(isAdminRole(user.role)
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
    <PortalShell user={user}>
        <header className="rounded-3xl border border-[#D4AF37]/40 bg-[#FDF8E8] p-6 shadow-sm shadow-emerald-950/5 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#8C6B1B]">
            <Radio className="size-4" /> Live learning
          </div>
          <h1 className="mt-3 text-4xl font-black">Upcoming classes</h1>
          <p className="mt-3 text-sm text-slate-600">
            All times are shown in your device&apos;s local timezone.
          </p>
        </header>

        <section className="flex min-w-0 flex-col gap-3">
          {sessions.map((session) => (
            <article
              className="flex min-w-0 flex-col gap-4 rounded-2xl border border-emerald-400 bg-emerald-50 p-5 shadow-sm shadow-emerald-950/5 sm:flex-row sm:items-center"
              key={session.id}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#084B2B] text-white">
                <Video className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase tracking-wider text-[#084B2B]">
                  {session.course.title}
                </p>
                <h2 className="mt-1 break-words text-lg font-black">{session.title}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
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
              {user.role === 'STUDENT' ? (
                <JoinLiveClassButton zoomSessionId={session.id} />
              ) : (
                <a className="shrink-0 rounded-xl bg-[#084B2B] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#063B22]" href={session.meetingUrl} rel="noopener noreferrer" target="_blank">Join meeting</a>
              )}
            </article>
          ))}
        </section>

        {!sessions.length ? (
          <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-12 text-center text-sm text-slate-500">
            No live classes are scheduled yet.
          </div>
        ) : null}
    </PortalShell>
  );
}
