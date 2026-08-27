import Image from 'next/image';
import {
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Sigma,
  Sparkles,
} from 'lucide-react';

const upcomingLessons = [
  { time: '5:30 PM', title: 'Newton’s Laws', subject: 'Physics' },
  { time: '7:00 PM', title: 'Differentiation', subject: 'Pure Math' },
] as const;

export function StudentDashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[38rem] px-2 py-12 sm:px-8 sm:py-16 lg:py-20">
      <div aria-hidden="true" className="absolute inset-x-12 inset-y-8 -z-10 rounded-full bg-emerald-200/50 blur-3xl" />
      <div aria-hidden="true" className="absolute right-4 top-8 size-28 rounded-[2rem] border border-[#D4AF37]/25 bg-[#FBF6E2]/60 sm:right-10" />
      <div aria-hidden="true" className="absolute bottom-8 left-3 size-24 rounded-full border border-emerald-900/10 bg-white/60 sm:left-8" />

      <div aria-hidden="true" className="absolute inset-x-5 top-6 z-0 h-44 -rotate-3 overflow-hidden rounded-[2rem] border border-[#D4AF37]/25 bg-[#084B2B] opacity-35 shadow-lg sm:inset-x-10 sm:top-8">
        <Image alt="" className="object-cover" fill sizes="(max-width: 1024px) 90vw, 38rem" src="/brand/oqool-banner.png" />
      </div>

      <div className="landing-float relative z-10 min-w-0 rounded-[2rem] border border-emerald-950/5 bg-white p-4 shadow-[0_28px_80px_rgba(8,75,43,0.14)] sm:p-6">
        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-emerald-950/5 pb-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0F6E41]">Student space</p>
            <h2 className="mt-1 truncate text-lg font-black text-[#1A2E22] sm:text-xl">Welcome back, Mariam</h2>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#084B2B] text-sm font-black text-white ring-4 ring-emerald-50">M</span>
        </header>

        <section className="mt-4 rounded-3xl bg-[#084B2B] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/65">
                <CalendarClock aria-hidden="true" className="size-4 text-[#E8C34E]" /> Today’s learning path
              </p>
              <h3 className="mt-3 text-xl font-black">Two lessons. One clear goal.</h3>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-[#F3D878]">ON TRACK</span>
          </div>
          <div className="mt-5 space-y-2">
            {upcomingLessons.map((lesson, index) => (
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.08] p-3" key={lesson.title}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-[#084B2B]">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-extrabold">{lesson.title}</span>
                  <span className="mt-0.5 block text-[10px] text-emerald-100/65">{lesson.subject} · {lesson.time}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[#E8C34E] rtl:rotate-180" />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[1.12fr_0.88fr]">
          <section className="min-w-0 rounded-3xl border border-emerald-950/5 bg-[#F7F8F4] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[#1A2E22]">KaTeX quiz progress</p>
              <Sigma aria-hidden="true" className="size-4 text-[#0F6E41]" />
            </div>
            <p className="mt-5 font-mono text-lg font-black tracking-tight text-[#084B2B]">∫ 2x dx = x² + C</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-950/10">
              <div className="h-full w-[86%] origin-left rounded-full bg-[#D4AF37] motion-safe:animate-[oqool-progress_1.2s_ease-out_both]" />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500"><span>12 of 14 steps</span><span className="text-[#084B2B]">86%</span></div>
          </section>

          <section className="flex flex-col justify-between rounded-3xl border border-emerald-950/5 bg-[#FBF6E2] p-4">
            <BookOpenCheck aria-hidden="true" className="size-5 text-[#A68020]" />
            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A68020]">Weekly streak</p>
              <p className="mt-1 text-2xl font-black text-[#1A2E22]">6 days</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CircleCheck className="size-3" /> Goal completed</p>
            </div>
          </section>
        </div>
      </div>

      <div className="landing-badge-float absolute right-0 top-4 z-20 flex items-center gap-2 rounded-full border border-emerald-950/5 bg-white px-3.5 py-2.5 shadow-lg shadow-emerald-950/10 sm:-right-2 sm:top-10">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#FBF6E2] text-[#A68020]"><Sparkles aria-hidden="true" className="size-4" /></span>
        <span><span className="block text-[10px] font-bold text-slate-500">Physics result</span><span className="block text-xs font-black text-[#084B2B]">Physics A+</span></span>
      </div>

      <div className="landing-badge-float absolute bottom-2 left-0 z-20 flex items-center gap-2 rounded-full border border-emerald-950/5 bg-white px-3.5 py-2.5 shadow-lg shadow-emerald-950/10 sm:-left-2 sm:bottom-8 [animation-delay:900ms]">
        <BadgeCheck aria-hidden="true" className="size-5 text-[#0F6E41]" />
        <span><span className="block text-[10px] font-bold text-slate-500">Weekly report</span><span className="block text-xs font-black text-[#1A2E22]">Parent Verified</span></span>
      </div>
    </div>
  );
}
