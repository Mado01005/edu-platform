'use client';

import { useActionState, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Check, Copy, Trash2, Video } from 'lucide-react';
import { cancelZoomSessionAction, scheduleZoomAction, type CourseActionState } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import type { TeacherCourse } from '@/components/teacher/course-editor-types';
import { cairoDateTimeLocalToUtc, formatCairoDateTime, formatUtcDateTime } from '@/lib/lms/timezone';

const initialState: CourseActionState = { error: null, success: false };

export function ZoomScheduler({ course }: { course: TeacherCourse }) {
  const [state, action] = useActionState(scheduleZoomAction.bind(null, course.id), initialState);
  const [startTime, setStartTime] = useState('');
  const [copied, setCopied] = useState('');
  const utcHelper = useMemo(() => {
    if (!startTime) return 'Choose a Cairo date and time to see the UTC equivalent.';
    const candidate = cairoDateTimeLocalToUtc(startTime);
    return candidate ? `Exact UTC: ${formatUtcDateTime(candidate)}` : 'Enter a valid Cairo date and time.';
  }, [startTime]);

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <form action={action} className="mx-auto flex w-full max-w-md min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm"><Video className="size-7" /></span>
            <span className="min-w-0"><span className="block text-lg font-black">Schedule New Live Zoom Class</span><span className="mt-1 flex items-center gap-1 text-xs font-bold text-sky-700"><CalendarDays className="size-3.5" /> Cairo · EET/EEST timezone</span></span>
          </div>
        </div>
        <label className="min-w-0 text-sm font-bold text-slate-700">Session Title
          <input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" name="title" placeholder="Weekly Mathematics review" required />
        </label>
        <label className="min-w-0 text-sm font-bold text-slate-700">Zoom Meeting URL
          <input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none invalid:border-red-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100" name="meetingUrl" pattern="https://.*zoom\.us/j/.+" placeholder="https://zoom.us/j/123456789" required type="url" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Use a secure zoom.us meeting link.</span>
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-bold text-slate-700">Start Date & Time
            <input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" name="startTime" onChange={(event) => setStartTime(event.target.value)} required type="datetime-local" value={startTime} />
            <span className="mt-1 block text-xs font-normal text-sky-700">Cairo local time (EET/EEST)</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">{utcHelper}</span>
          </label>
          <label className="min-w-0 text-sm font-bold text-slate-700">Duration (Minutes)
            <input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue="60" max="480" min="5" name="duration" required type="number" />
          </label>
        </div>
        {state.error ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
        {state.success ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Zoom session scheduled.</p> : null}
        <ActionSubmitButton className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-base font-black text-white shadow-sm hover:bg-sky-700" pendingLabel="Scheduling…"><CalendarPlus className="size-5" /> Schedule New Live Zoom Class</ActionSubmitButton>
      </form>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">Upcoming scheduled classes</h2>
        <div className="mt-3 flex min-w-0 flex-col gap-3">
          {course.zoomSessions.map((session) => (
            <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center" key={session.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{session.title}</p>
                <p className="mt-1 text-xs text-slate-600">{formatCairoDateTime(session.startTime)} · {session.duration} min</p>
                <p className="mt-1 text-[10px] text-slate-500">{formatUtcDateTime(session.startTime)}</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700" onClick={async () => { await navigator.clipboard.writeText(session.meetingUrl); setCopied(session.id); }} type="button">{copied === session.id ? <Check className="size-3" /> : <Copy className="size-3" />} {copied === session.id ? 'Copied' : 'Copy Invite Link'}</button>
                <form action={cancelZoomSessionAction.bind(null, session.id)}>
                  <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600" pendingLabel="Cancelling…"><Trash2 className="size-3" /> Cancel Session</ActionSubmitButton>
                </form>
              </div>
            </article>
          ))}
          {!course.zoomSessions.length ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No upcoming sessions.</p> : null}
        </div>
      </section>
    </section>
  );
}
