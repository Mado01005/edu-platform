import { Activity, BarChart3, Clock3, FileCheck2, GraduationCap, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ParentRadarClient } from '@/app/mps/ParentRadarClient';
import { ParentPortalShell } from '@/components/erp/ParentPortalShell';
import { getParentPortalSession } from '@/lib/lms/parent-portal';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function dateTime(value: Date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default async function ParentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const [session, params] = await Promise.all([getParentPortalSession(), searchParams]);
  if (!session) redirect('/mps/login');
  const prisma = getPrisma();
  const links = await prisma.parentStudent.findMany({
    where: { parentId: session.parent.id, student: { role: 'STUDENT', status: 'ACTIVE' } },
    orderBy: { student: { name: 'asc' } },
    select: { student: { select: { email: true, gradeLevel: true, id: true, name: true } } },
  });
  const children = links.map(({ student }) => student);
  const selected = children.find(({ id }) => id === params.student) ?? children[0];

  if (!selected) {
    return (
      <ParentPortalShell>
        <h1 className="text-3xl font-black">MPS+ Parent Radar</h1>
        <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-zinc-400">No active student is linked to this parent account. Contact academy support.</p>
        <ParentRadarClient />
      </ParentPortalShell>
    );
  }

  const [attendance, enrollments, submissions, approvedOnline, approvedManual, subscriptions] = await Promise.all([
    prisma.digitalAttendance.findMany({
      where: { studentId: selected.id },
      include: { course: { select: { title: true } }, lesson: { select: { title: true } }, zoomSession: { select: { title: true } } },
      orderBy: { joinedAt: 'desc' },
      take: 30,
    }),
    prisma.enrollment.findMany({
      where: { studentId: selected.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  where: { contentType: { in: ['VIMEO', 'YOUTUBE', 'R2_VIDEO'] } },
                  include: { progress: { where: { studentId: selected.id }, select: { watchPercentage: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId: selected.id, assignment: { type: 'QUIZ' } },
      include: { assignment: { include: { course: { select: { title: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.onlinePaymentSubmission.findMany({
      where: { studentId: selected.id, status: 'APPROVED' },
      include: { course: { select: { title: true } } },
      orderBy: { reviewedAt: 'desc' },
      take: 50,
    }),
    prisma.uSDManualLedger.findMany({
      where: { studentId: selected.id, status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
      take: 50,
    }),
    prisma.studentSubscription.findMany({
      where: { studentId: selected.id, status: 'APPROVED' },
      include: { course: { select: { title: true } } },
      orderBy: { approvedAt: 'desc' },
    }),
  ]);
  const averages = submissions.length
    ? await prisma.assignmentSubmission.groupBy({
        by: ['assignmentId'],
        where: { assignmentId: { in: submissions.map(({ assignmentId }) => assignmentId) }, grade: { not: null } },
        _avg: { grade: true },
      })
    : [];
  const averageByAssignment = new Map(averages.map((item) => [item.assignmentId, item._avg.grade]));
  const videoProgress = enrollments.map(({ course }) => {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const total = lessons.reduce((sum, lesson) => sum + (lesson.progress[0]?.watchPercentage ?? 0), 0);
    return { id: course.id, percentage: lessons.length ? Math.round(total / lessons.length) : 0, title: course.title };
  });

  return (
    <ParentPortalShell>
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.22),transparent_55%)] p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-300 text-black"><GraduationCap className="size-5" /></span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">MPS+ real-time learning analytics</p>
          <h1 className="mt-2 text-3xl font-black">Parent radar</h1>
          <p className="mt-2 text-sm text-zinc-400">Welcome, {session.parent.name ?? session.parent.phoneNumber ?? 'Parent'}. Data refreshes every 30 seconds.</p>
        </header>
        <ParentRadarClient />

        <nav aria-label="Select student" className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {children.map((child) => <Link className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black ${child.id === selected.id ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-white/10 text-zinc-400'}`} href={`/mps?student=${encodeURIComponent(child.id)}`} key={child.id}>{child.name ?? child.email}</Link>)}
        </nav>

        <section className="grid min-w-0 grid-cols-3 gap-2">
          {[{ label: 'Classes', value: attendance.filter(({ type }) => type === 'LIVE_ZOOM').length }, { label: 'Courses', value: enrollments.length }, { label: 'Quizzes', value: submissions.length }].map((metric) => <div className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-3 text-center" key={metric.label}><p className="text-xl font-black">{metric.value}</p><p className="truncate text-[9px] font-bold uppercase text-zinc-500">{metric.label}</p></div>)}
        </section>

        <section className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-950 p-4" id="attendance">
          <h2 className="flex items-center gap-2 font-black"><Clock3 className="size-4 text-cyan-300" /> Digital attendance</h2>
          <div className="mt-3 flex flex-col gap-2">{attendance.map((record) => <div className="rounded-xl bg-black p-3" key={record.id}><div className="flex min-w-0 justify-between gap-2"><p className="min-w-0 truncate text-sm font-bold">{record.zoomSession?.title ?? record.lesson?.title ?? record.course.title}</p><span className="shrink-0 text-[10px] text-cyan-300">{record.type.replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-zinc-500">Joined {dateTime(record.joinedAt)} · {record.durationMin} min tracked</p></div>)}{!attendance.length ? <p className="text-sm text-zinc-500">No digital attendance recorded yet.</p> : null}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <h2 className="flex items-center gap-2 font-black"><BarChart3 className="size-4 text-violet-300" /> Video watch progress</h2>
          <div className="mt-3 flex flex-col gap-3">{videoProgress.map((course) => <div key={course.id}><div className="flex min-w-0 justify-between gap-2 text-xs"><span className="truncate font-bold">{course.title}</span><span>{course.percentage}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${course.percentage}%` }} /></div></div>)}{!videoProgress.length ? <p className="text-sm text-zinc-500">No active online courses.</p> : null}</div>
        </section>

        <section className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-950 p-4" id="report-cards">
          <h2 className="flex items-center gap-2 font-black"><Activity className="size-4 text-amber-300" /> Online quiz grades</h2>
          <div className="mt-3 flex flex-col gap-2">{submissions.map((submission) => <article className="rounded-xl bg-black p-3" key={submission.id}><div className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate text-sm font-bold">{submission.assignment.title}</span><span className="shrink-0 font-black text-amber-300">{submission.grade?.toFixed(1) ?? '—'}%</span></div><p className="mt-1 text-xs text-zinc-500">{submission.assignment.course.title} · Class avg {averageByAssignment.get(submission.assignmentId)?.toFixed(1) ?? '—'}%</p>{submission.feedback ? <p className="mt-2 text-xs leading-5 text-zinc-300">Teacher: {submission.feedback}</p> : null}</article>)}{!submissions.length ? <p className="text-sm text-zinc-500">No quiz submissions yet.</p> : null}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <h2 className="flex items-center gap-2 font-black"><FileCheck2 className="size-4 text-emerald-300" /> Active subscriptions</h2>
          <div className="mt-3 flex flex-col gap-2">{subscriptions.map((subscription) => <div className="rounded-xl bg-black p-3 text-sm font-bold" key={subscription.id}>{subscription.course.title}</div>)}{!subscriptions.length ? <p className="text-sm text-zinc-500">No paid subscriptions yet.</p> : null}</div>
        </section>

        <section className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-950 p-4" id="invoices">
          <h2 className="flex items-center gap-2 font-black"><ReceiptText className="size-4 text-pink-300" /> Digital invoices</h2>
          <div className="mt-3 flex flex-col gap-2">
            {approvedOnline.map((payment) => <div className="rounded-xl bg-black p-3" key={payment.id}><div className="flex min-w-0 justify-between gap-2 text-sm"><span className="truncate font-bold">{payment.course.title}</span><span className="shrink-0 font-black">{payment.amount.toFixed(2)} {payment.currency}</span></div><p className="mt-1 text-xs text-zinc-500">{payment.invoiceNumber ?? 'Digital receipt'} · {payment.reviewedAt ? dateTime(payment.reviewedAt) : ''}</p></div>)}
            {approvedManual.map((payment) => <div className="rounded-xl bg-black p-3" key={payment.id}><div className="flex min-w-0 justify-between gap-2 text-sm"><span className="truncate font-bold">{payment.receiptNumber}</span><span className="shrink-0 font-black">{(payment.currency === 'EGP' ? payment.amountEGP : payment.amountUSD)?.toFixed(2)} {payment.currency}</span></div></div>)}
            {!approvedOnline.length && !approvedManual.length ? <p className="text-sm text-zinc-500">No paid receipts yet.</p> : null}
          </div>
        </section>
    </ParentPortalShell>
  );
}
