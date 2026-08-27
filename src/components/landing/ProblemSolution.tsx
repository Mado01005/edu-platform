import Link from 'next/link';
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Check,
  EyeOff,
  Files,
  Flag,
  LineChart,
  Route,
  Sparkles,
} from 'lucide-react';

const painPoints = [
  {
    description: 'Crowded revision rooms force every student through the same pace, whether the idea has landed or not.',
    icon: Building2,
    number: '01',
    title: 'Crammed centres, one fixed pace',
  },
  {
    description: 'Videos, notes, homework, and links live in different places, so effort gets spent organising instead of learning.',
    icon: Files,
    number: '02',
    title: 'Material without a clear sequence',
  },
  {
    description: 'Students and parents discover the gaps after the result—when there is little time left to correct them.',
    icon: EyeOff,
    number: '03',
    title: 'Feedback arrives too late',
  },
] as const;

const masterySteps = [
  {
    description: 'Know the chapter goal and the exact milestones ahead.',
    icon: Flag,
    title: 'Orient',
  },
  {
    description: 'Learn through expert live teaching and protected HD explanations.',
    icon: BookOpenCheck,
    title: 'Understand',
  },
  {
    description: 'Practise with guided KaTeX steps, homework, and configurable retakes.',
    icon: Sparkles,
    title: 'Apply',
  },
  {
    description: 'Turn completion, scores, attendance, and feedback into the next plan.',
    icon: LineChart,
    title: 'Prove',
  },
] as const;

export function ProblemSolution() {
  return (
    <>
      <section className="py-20 md:py-28" id="problem">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A68020]">04 / The friction</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
                More tutoring does not always mean more clarity.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              The real problem is fragmentation: one pace, scattered materials, and feedback that arrives after the moment to act.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {painPoints.map((point) => {
              const Icon = point.icon;
              return (
                <article className="landing-card group relative min-w-0 overflow-hidden rounded-3xl border border-emerald-950/5 bg-white p-6 hover:-translate-y-1 hover:shadow-lg sm:p-7" key={point.number}>
                  <div aria-hidden="true" className="absolute right-0 top-0 size-28 rounded-bl-full bg-rose-50/80" />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-4xl font-black tracking-tighter text-rose-950/[0.08]">{point.number}</span>
                  </div>
                  <h3 className="relative mt-8 text-xl font-black text-[#1A2E22]">{point.title}</h3>
                  <p className="relative mt-3 text-sm leading-6 text-slate-600">{point.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#042D1A] py-20 text-white md:py-28" id="mastery">
        <div aria-hidden="true" className="absolute -right-36 top-0 -z-10 size-96 rounded-full border border-[#D4AF37]/15" />
        <div aria-hidden="true" className="absolute -left-44 bottom-0 -z-10 size-[28rem] rounded-full bg-emerald-700/20 blur-3xl" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F3D878]">05 / The Oqool model</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                One structured loop from lesson to mastery.
              </h2>
            </div>
            <div className="max-w-2xl">
              <p className="text-sm leading-7 text-emerald-100/70 sm:text-base">
                Every feature serves the same learning sequence, so students always know where they are, what comes next, and what progress looks like.
              </p>
              <Link className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D4AF37]/50 px-5 text-sm font-black text-[#F3D878] outline-none hover:bg-white/5 focus-visible:ring-4 focus-visible:ring-[#D4AF37]/30" href="/catalog">
                See the mastery paths <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] md:grid-cols-2 xl:grid-cols-4">
            {masterySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="relative min-w-0 border-b border-white/10 p-6 last:border-b-0 md:border-r md:[&:nth-child(2)]:border-r-0 md:[&:nth-child(3)]:border-b-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:[&:nth-child(3)]:border-r" key={step.title}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#F3D878]"><Icon aria-hidden="true" className="size-5" /></span>
                    <span className="text-xs font-black text-emerald-100/35">0{index + 1}</span>
                  </div>
                  <h3 className="mt-8 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-emerald-100/65">{step.description}</p>
                  <p className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#F3D878]"><Check aria-hidden="true" className="size-4" /> Connected milestone</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-100/50">
            <Route aria-hidden="true" className="size-4 text-[#D4AF37]" /> Preview → Learn → Practise → Master
          </div>
        </div>
      </section>
    </>
  );
}
