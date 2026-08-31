import { CircleHelp, Layers3, SearchX } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const icons = [SearchX, Layers3, CircleHelp] as const;

export function ProblemSection() {
  return (
    <section className="scroll-mt-28 py-20 md:py-28" id="programs">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.problem.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-white sm:text-5xl">{landingContent.problem.title}</LandingCopy>
          <LandingCopy as="p" className="mt-5 max-w-2xl text-base leading-8 text-brand-muted/80">{landingContent.problem.description}</LandingCopy>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {landingContent.problem.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <article className="landing-card min-w-0 rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45 hover:shadow-2xl hover:shadow-black/25 sm:p-8" key={item.title.en}>
                <div className="flex items-center justify-between gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-brand-base text-brand-gold"><Icon aria-hidden="true" className="size-5" /></span><span aria-hidden="true" className="text-4xl font-black text-brand-gold/35">0{index + 1}</span></div>
                <LandingCopy as="h3" className="mt-8 text-xl font-black text-brand-white">{item.title}</LandingCopy>
                <LandingCopy as="p" className="mt-3 text-sm leading-7 text-brand-muted/80">{item.description}</LandingCopy>
              </article>
            );
          })}
        </div>
        <div className="mt-6 rounded-3xl border border-brand-rim border-s-4 border-s-brand-gold bg-brand-surface px-6 py-6 text-brand-white shadow-2xl shadow-black/20 backdrop-blur-md sm:px-8"><LandingCopy className="text-base font-black leading-8 sm:text-lg">{landingContent.problem.bridge}</LandingCopy></div>
      </div>
    </section>
  );
}
