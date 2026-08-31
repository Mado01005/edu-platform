import { BarChart3, BookOpenCheck, ClipboardCheck, FileText, GraduationCap, Route, Search, SlidersHorizontal } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const icons = [Search, Route, GraduationCap, BookOpenCheck, ClipboardCheck, BarChart3, FileText, SlidersHorizontal] as const;

export function SolutionFramework() {
  return (
    <section className="scroll-mt-28 bg-brand-surface py-20 text-brand-white md:py-28" id="how-it-works">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.solution.eyebrow}</LandingCopy>
            <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">{landingContent.solution.title}</LandingCopy>
            <LandingCopy as="p" className="mt-5 text-base leading-8 text-brand-muted/75">{landingContent.solution.description}</LandingCopy>
            <LandingCopy as="p" className="mt-8 rounded-2xl border border-brand-rim bg-brand-base p-5 text-sm font-black leading-7 text-brand-gold-hover shadow-2xl shadow-black/30 backdrop-blur-md">{landingContent.solution.conclusion}</LandingCopy>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {landingContent.solution.steps.map(([title, description], index) => {
              const Icon = icons[index];
              return (
                <li className="landing-card group rounded-3xl border border-brand-border bg-brand-base p-5 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45 sm:p-6" key={title.en}>
                  <div className="flex items-center justify-between gap-4"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand-surface text-brand-gold"><Icon aria-hidden="true" className="size-5" /></span><span className="text-xs font-black tabular-nums text-brand-muted/35">{String(index + 1).padStart(2, '0')}</span></div>
                  <LandingCopy as="h3" className="mt-6 text-lg font-black">{title}</LandingCopy>
                  <LandingCopy as="p" className="mt-2 text-sm leading-6 text-brand-muted/65">{description}</LandingCopy>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
