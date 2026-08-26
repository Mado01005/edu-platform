'use client';

import { CalendarClock, CheckCircle2, Play, TrendingUp } from 'lucide-react';

const progress = [
  { label: 'Mechanics · Motion', value: 82 },
  { label: 'Pure Math · Calculus', value: 64 },
  { label: 'Chemistry · Atomic theory', value: 41 },
] as const;

export function StudentDashboardPreview() {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-emerald-950/10 bg-white p-3 sm:p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#D4AF37]" />
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-emerald-950/10 pb-4 pt-1">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F6E41]">Student command desk</p>
          <h2 className="mt-1 truncate text-lg font-extrabold text-[#1A2E22]">Good afternoon, Mariam</h2>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#084B2B] text-sm font-black text-white">M</span>
      </header>

      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[1.2fr_0.8fr]">
        <section className="min-w-0 rounded-2xl border border-emerald-950/10 bg-[#F8FAF8] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold text-[#1A2E22]">Current chapter progress</p>
            <TrendingUp aria-hidden="true" className="size-4 text-[#0F6E41]" />
          </div>
          <div className="mt-4 space-y-4">
            {progress.map((item, index) => (
              <div className="min-w-0" key={item.label}>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate font-bold text-slate-600">{item.label}</span>
                  <span className="font-black tabular-nums text-[#084B2B]">{item.value}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-950/10">
                  <div
                    className="h-full origin-left rounded-full bg-[#084B2B] motion-safe:animate-[oqool-progress_1.2s_ease-out_both]"
                    style={{ animationDelay: `${index * 140}ms`, width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#042D1A] p-4 text-white">
          <CalendarClock aria-hidden="true" className="size-5 text-[#D4AF37]" />
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/65">Upcoming exam</p>
          <h3 className="mt-1 text-base font-extrabold">Physics mock 03</h3>
          <p className="mt-1 text-xs text-emerald-100/70">Sunday · 7:30 PM</p>
          <span className="mt-4 inline-flex rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-black text-[#F3D878]">45 MIN · 2 ATTEMPTS</span>
        </section>
      </div>

      <section className="mt-3 flex min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FBF6E2] text-[#8C6B1B]">
          <Play aria-hidden="true" className="size-4 fill-current" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-extrabold text-[#1A2E22]">Continue: Newton&apos;s Second Law</span>
          <span className="mt-1 block text-[10px] text-slate-500">3 active enrollments · next lesson unlocked</span>
        </span>
        <CheckCircle2 aria-label="On track" className="size-5 shrink-0 text-[#0F6E41]" />
      </section>
    </div>
  );
}
