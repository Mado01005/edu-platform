import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function FreeSessionSection() {
  const content = landingContent.freeSession;
  return (
    <section className="scroll-mt-28 bg-brand-ivory-alt py-20 text-brand-base md:py-28" id="free-session">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="border-s-2 border-brand-gold ps-3 text-xs font-black uppercase tracking-[0.18em] text-brand-base">{content.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-base sm:text-5xl">{content.title}</LandingCopy>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-start">
          <ol className="grid gap-3">
            {content.steps.map(([title, description], index) => (
              <li className="landing-card flex min-w-0 items-start gap-4 rounded-3xl border border-brand-mint-border bg-white p-5 shadow-sm" key={title.en}>
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-gold text-sm font-black text-brand-base">{index + 1}</span>
                <div className="min-w-0">
                  <LandingCopy as="h3" className="block font-black text-brand-base">{title}</LandingCopy>
                  <LandingCopy as="p" className="mt-1 text-sm leading-7 text-brand-surface/80">{description}</LandingCopy>
                </div>
              </li>
            ))}
          </ol>
          <div className="grid gap-3">
            <LandingCopy as="p" className="rounded-3xl bg-brand-gold p-6 text-xl font-black text-brand-base">{content.highlight}</LandingCopy>
            {content.points.map((point) => (
              <LandingCopy as="p" className="rounded-3xl bg-brand-base p-6 text-sm leading-7 text-brand-white" key={point.en}>{point}</LandingCopy>
            ))}
            <WhatsAppLink className="landing-cta mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-gold px-6 text-sm font-black text-brand-base shadow-md shadow-brand-gold/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="hero_free_lesson_click" intent="freeLesson" label="free_session_section">
              {landingContent.hero.primary}
            </WhatsAppLink>
          </div>
        </div>
      </div>
    </section>
  );
}
