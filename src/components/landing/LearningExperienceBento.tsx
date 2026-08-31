import { BookMarked, Calculator, ClipboardCheck, Laptop2, MessageSquareText, Radio } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';
import { landingFeatureFlags } from '@/lib/landing/featureFlags';

const visuals = { diagnostic: ClipboardCheck, assessment: Calculator, resources: BookMarked, devices: Laptop2, parents: MessageSquareText, live: Radio } as const;
const cardClasses = [
  'md:col-span-7 border-brand-border bg-brand-surface text-brand-white shadow-black/30',
  'md:col-span-5 border-brand-rim bg-brand-base text-brand-white shadow-black/30',
  'md:col-span-5 border-brand-border bg-brand-surface text-brand-white shadow-black/30',
  'md:col-span-7 border-brand-rim bg-brand-base text-brand-white shadow-black/30',
  'md:col-span-7 border-brand-gold/35 bg-brand-surface text-brand-white shadow-black/30',
  'md:col-span-5 border-brand-rim bg-brand-base text-brand-white shadow-black/30',
] as const;

export function LearningExperienceBento() {
  return (
    <section className="scroll-mt-28 py-20 md:py-28" id="progress">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.features.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-white sm:text-5xl">{landingContent.features.title}</LandingCopy>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          {landingContent.features.items.map((item, index) => {
            const Icon = visuals[item.id as keyof typeof visuals];
            const dark = index === 1 || index === 5;
            const available = item.id === 'assessment'
              ? landingFeatureFlags.assessmentExperience.status === 'available'
              : item.id === 'parents' && landingFeatureFlags.parentProgressTracking.status === 'available';
            return (
              <article className={`landing-card relative min-h-64 overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-8 ${cardClasses[index]}`} key={item.id}>
                <div aria-hidden="true" className={`absolute -end-12 -top-12 size-40 rounded-full border-[24px] ${dark ? 'border-brand-border/35' : 'border-brand-gold/10'}`} />
                <div className="relative flex h-full min-w-0 flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`flex size-12 items-center justify-center rounded-2xl ${dark ? 'bg-brand-surface text-brand-gold' : 'bg-brand-base text-brand-gold'}`}><Icon aria-hidden="true" className="size-5" /></span>
                    {available ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/35 px-3 py-1 text-[9px] font-black uppercase tracking-wide">
                        <span aria-hidden="true" className="relative flex size-2 shrink-0">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-gold-hover opacity-60" />
                          <span className="relative inline-flex size-2 rounded-full bg-brand-gold shadow-[0_0_12px_rgba(229,184,92,0.9)]" />
                        </span>
                        <LandingCopy className="text-brand-gold">{{ en: 'Available', ar: 'متاح' }}</LandingCopy>
                      </span>
                    ) : null}
                  </div>
                  <LandingCopy as="h3" className="mt-8 text-2xl font-black text-brand-white">{item.title}</LandingCopy>
                  <LandingCopy as="p" className="mt-2 text-base font-black text-brand-gold-hover">{item.description}</LandingCopy>
                  <LandingCopy as="p" className="mt-4 max-w-xl text-sm leading-7 text-brand-muted/70">{item.detail}</LandingCopy>
                  {item.id === 'assessment' ? <div className="mt-auto pt-6" aria-label="Static mathematical notation sample"><div className="rounded-2xl border border-brand-rim bg-brand-surface p-4 font-mono text-sm text-brand-white">x² + 5x + 6 = (x + 2)(x + 3)</div></div> : null}
                  {item.id === 'parents' ? <div className="mt-auto grid grid-cols-3 gap-2 pt-6" aria-hidden="true">{[{ label: 'Attend', width: 'w-full' }, { label: 'Practice', width: 'w-4/5' }, { label: 'Assess', width: 'w-3/5' }].map((bar) => <div className="rounded-xl bg-brand-base p-2" key={bar.label}><span className="block text-[8px] font-black uppercase text-brand-muted/65">{bar.label}</span><span className={`mt-2 block h-1.5 rounded-full bg-brand-gold ${bar.width}`} /></div>)}</div> : null}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center rounded-full border border-brand-gold bg-brand-gold px-6 text-sm font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-xl hover:shadow-black/30 focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="preview_lesson_click" intent="freeLesson" label="learning_experience">
            {{ en: 'Preview Lesson', ar: 'شاهد حصة تجريبية' }}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
