import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function ExpectSection() {
  const content = landingContent.expect;
  return (
    <section className="scroll-mt-28 bg-brand-base py-20 text-brand-white md:py-28" id="what-to-expect">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{content.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">{content.title}</LandingCopy>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.facts.map(([figure, text]) => (
            <li className="landing-card min-w-0 rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-sm" key={text.en}>
              <span className="block text-3xl font-black text-brand-gold" dir="ltr">{figure}</span>
              <LandingCopy as="p" className="mt-3 text-sm leading-7 text-brand-muted/80">{text}</LandingCopy>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
