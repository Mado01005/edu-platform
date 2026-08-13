import { CalendarCheck2, Clock3, MonitorPlay, Radio, Users } from 'lucide-react';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const teacher = await requireTeacherPage();
  const attendance = await getPrisma().digitalAttendance.findMany({
    where: isAdminRole(teacher.role)
      ? {}
      : { course: { teacherId: teacher.id } },
    include: {
      course: { select: { title: true } },
      lesson: { select: { title: true } },
      student: { select: { email: true, name: true } },
      zoomSession: { select: { title: true } },
    },
    orderBy: { joinedAt: 'desc' },
    take: 200,
  });
  const uniqueStudents = new Set(attendance.map(({ studentId }) => studentId));
  const liveCount = attendance.filter(({ type }) => type === 'LIVE_ZOOM').length;

  return (
    <>
      <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <CalendarCheck2 className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
          Digital attendance
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Student attendance
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          See when students joined live classes or watched at least half of a video lesson.
        </p>
      </header>

      <section className="grid min-w-0 grid-cols-3 gap-2">
        {[
          { icon: Users, label: 'Students', value: uniqueStudents.size },
          { icon: Radio, label: 'Live joins', value: liveCount },
          { icon: MonitorPlay, label: 'All records', value: attendance.length },
        ].map(({ icon: Icon, label, value }) => (
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 text-center shadow-sm shadow-slate-200/50" key={label}>
            <Icon className="mx-auto size-4 text-sky-700" aria-hidden="true" />
            <p className="mt-2 text-xl font-black">{value}</p>
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="font-black">Recent attendance</h2>
          <p className="mt-1 text-xs text-slate-500">Latest 200 digital attendance records</p>
        </div>
        <div className="divide-y divide-slate-100">
          {attendance.map((record) => (
            <article className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5" key={record.id}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                {record.type === 'LIVE_ZOOM' ? (
                  <Radio className="size-4" aria-hidden="true" />
                ) : (
                  <MonitorPlay className="size-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">
                  {record.student.name ?? record.student.email}
                </p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {record.course.title} · {record.zoomSession?.title ?? record.lesson?.title ?? record.type.replaceAll('_', ' ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500 sm:text-right">
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3" aria-hidden="true" />
                  {record.durationMin} min
                </span>
                <LocalDateTime date={record.joinedAt} />
              </div>
            </article>
          ))}
          {!attendance.length ? (
            <p className="p-10 text-center text-sm text-slate-500">
              Attendance will appear after students join a live class or watch half of a lesson.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
