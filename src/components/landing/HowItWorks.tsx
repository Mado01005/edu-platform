import Link from 'next/link';
import { ArrowRight, Eye, Layers3, Trophy } from 'lucide-react';

const steps = [
  {
    description: 'Open the catalog and see the teaching structure before choosing a path.',
    icon: Eye,
    label: 'Preview',
    number: '01',
    title: 'See how Oqool teaches',
  },
  {
    description: 'Sign in, choose a full term or chapter, and submit the right payment path.',
    icon: Layers3,
    label: 'Join',
    number: '02',
    title: 'Choose your mastery path',
  },
  {
    description: 'Learn, practise, submit, and improve through one connected progress loop.',
    icon: Trophy,
    label: 'Master',
    number: '03',
    title: 'Turn effort into evidence',
  },
] as const;

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28" id="how-it-works">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">07 / How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
              Three steps. No learning maze.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Every step removes uncertainty: preview the approach, choose the right scope, then follow a visible mastery plan.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li className="landing-card group relative min-w-0 rounded-3xl border border-emerald-950/5 bg-white p-6 hover:-translate-y-1 hover:shadow-lg sm:p-7" key={step.number}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#084B2B]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-4xl font-black tracking-tighter text-emerald-950/[0.08]">{step.number}</span>
                </div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.18em] text-[#A68020]">{step.label}</p>
                <h3 className="mt-2 text-xl font-black text-[#1A2E22]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                {index < steps.length - 1 ? (
                  <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full bg-[#D4AF37] p-1 text-[#042D1A] lg:block" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 text-center">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#084B2B] px-6 text-sm font-black text-white outline-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0F6E41] hover:shadow-lg focus-visible:ring-4 focus-visible:ring-emerald-200"
            href="/catalog"
          >
            Explore the curriculum <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
