import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function ExpectSection() {
  const content = landingContent.expect;
  return (
    <section className="scroll-mt-28 bg-brand-mint-light py-20 text-brand-base md:py-28" id="what-to-expect">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-sm font-extrabold tracking-normal text-brand-surface">{content.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">{content.title}</LandingCopy>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {content.facts.map(([figure, text]) => (
            <li className="landing-card group min-w-0 rounded-2xl border first:lg:col-span-2 first:lg:rounded-3xl first:lg:p-8 border-brand-mint-border bg-white p-6 text-brand-base shadow-sm" key={text.en}>
              <span className="block text-3xl font-black text-brand-gold-bronze lg:group-first:text-5xl" dir="ltr">{figure}</span>
              <LandingCopy as="p" className="mt-3 text-sm leading-7 text-brand-surface/85">{text}</LandingCopy>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
