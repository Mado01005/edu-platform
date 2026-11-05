import { BookMarked, ClipboardCheck, UserRoundCheck } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const visuals = { teacher: UserRoundCheck, feedback: ClipboardCheck, resources: BookMarked } as const;
const cardClasses = [
  'md:col-span-4 border-brand-mint-border bg-white text-brand-base shadow-brand-base/8',
  'md:col-span-4 border-brand-mint-border bg-white text-brand-base shadow-brand-base/8',
  'md:col-span-4 border-brand-mint-border bg-white text-brand-base shadow-brand-base/8',
] as const;

export function LearningExperienceBento() {
  return (
    <section className="scroll-mt-28 bg-brand-ivory py-20 text-brand-base md:py-28" id="progress">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="border-s-2 border-brand-gold ps-3 text-sm font-extrabold tracking-normal text-brand-base">{landingContent.features.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-base sm:text-5xl">{landingContent.features.title}</LandingCopy>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          {landingContent.features.items.map((item, index) => {
            const Icon = visuals[item.id as keyof typeof visuals];
            return (
              <article className={`landing-card relative min-h-64 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 ${cardClasses[index]}`} key={item.id}>
                <div aria-hidden="true" className="absolute -end-12 -top-12 size-40 rounded-full border-[24px] border-brand-gold/10" />
                <div className="relative flex h-full min-w-0 flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-base"><Icon aria-hidden="true" className="size-5" /></span>
                  </div>
                  <LandingCopy as="h3" className="mt-8 text-2xl font-black text-brand-base">{item.title}</LandingCopy>
                  <LandingCopy as="p" className="mt-2 text-base font-black text-brand-surface">{item.description}</LandingCopy>
                  <LandingCopy as="p" className="mt-4 max-w-xl text-sm leading-7 text-brand-surface/75">{item.detail}</LandingCopy>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <WhatsAppLink className="landing-cta inline-flex min-h-11 items-center font-black text-brand-base underline decoration-brand-gold decoration-2 underline-offset-4 outline-none hover:text-brand-gold-bronze focus-visible:ring-4 focus-visible:ring-brand-gold/30 rounded-md" eventName="hero_free_lesson_click" intent="freeLesson" label="learning_experience">
            {{ en: 'Book Your Free First Session', ar: 'احجز أول حصة مجانية' }}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
