'use client';

import { useActionState, useMemo, useState } from 'react';
import { CalendarPlus, Check, Copy, Radio, Trash2 } from 'lucide-react';
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
      <form action={action} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="flex items-center gap-2 font-black"><Radio className="size-5 text-emerald-300" /> Schedule a Zoom session</h2>
        <label className="min-w-0 text-sm font-bold text-zinc-300">Session Title
          <input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" name="title" placeholder="Weekly Mathematics review" required />
        </label>
        <label className="min-w-0 text-sm font-bold text-zinc-300">Zoom Meeting URL
          <input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white invalid:border-red-400" name="meetingUrl" pattern="https://.*zoom\.us/j/.+" placeholder="https://zoom.us/j/123456789" required type="url" />
          <span className="mt-1 block text-xs font-normal text-zinc-500">Use a secure zoom.us meeting link.</span>
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-bold text-zinc-300">Start Date & Time
            <input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" name="startTime" onChange={(event) => setStartTime(event.target.value)} required type="datetime-local" value={startTime} />
            <span className="mt-1 block text-xs font-normal text-cyan-300">Cairo local time (EET/EEST)</span>
            <span className="mt-1 block text-xs font-normal text-zinc-500">{utcHelper}</span>
          </label>
          <label className="min-w-0 text-sm font-bold text-zinc-300">Duration (Minutes)
            <input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue="60" max="480" min="5" name="duration" required type="number" />
          </label>
        </div>
        {state.error ? <p aria-live="polite" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p> : null}
        {state.success ? <p aria-live="polite" className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">Zoom session scheduled.</p> : null}
        <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-black" pendingLabel="Scheduling…"><CalendarPlus className="size-4" /> Schedule class</ActionSubmitButton>
      </form>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="font-black">Upcoming scheduled classes</h2>
        <div className="mt-3 flex min-w-0 flex-col gap-3">
          {course.zoomSessions.map((session) => (
            <article className="flex min-w-0 flex-col gap-3 rounded-xl bg-black p-3 sm:flex-row sm:items-center" key={session.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{session.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatCairoDateTime(session.startTime)} · {session.duration} min</p>
                <p className="mt-1 text-[10px] text-zinc-600">{formatUtcDateTime(session.startTime)}</p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold" onClick={async () => { await navigator.clipboard.writeText(session.meetingUrl); setCopied(session.id); }} type="button">{copied === session.id ? <Check className="size-3" /> : <Copy className="size-3" />} {copied === session.id ? 'Copied' : 'Copy Invite Link'}</button>
                <form action={cancelZoomSessionAction.bind(null, session.id)}>
                  <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300" pendingLabel="Cancelling…"><Trash2 className="size-3" /> Cancel Session</ActionSubmitButton>
                </form>
              </div>
            </article>
          ))}
          {!course.zoomSessions.length ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-zinc-500">No upcoming sessions.</p> : null}
        </div>
      </section>
    </section>
  );
}
