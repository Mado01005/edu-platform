import { BookMarked, Calculator, ClipboardCheck, Laptop2, MessageSquareText, Radio } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';
import { landingFeatureFlags } from '@/lib/landing/featureFlags';

const visuals = { diagnostic: ClipboardCheck, assessment: Calculator, resources: BookMarked, devices: Laptop2, parents: MessageSquareText, live: Radio } as const;
const cardClasses = [
  'md:col-span-7 border-emerald-500/15 bg-white/80 shadow-emerald-950/10',
  'md:col-span-5 border-emerald-500/15 bg-emerald-950/60 text-white shadow-black/30',
  'md:col-span-5 border-emerald-500/15 bg-white/70 shadow-emerald-950/10',
  'md:col-span-7 border-emerald-500/15 bg-white/80 shadow-emerald-950/10',
  'md:col-span-7 border-[#D4AF37]/25 bg-[#FBF6E2]/80 shadow-[#D4AF37]/10',
  'md:col-span-5 border-emerald-500/15 bg-emerald-950/60 text-white shadow-black/30',
] as const;

export function LearningExperienceBento() {
  return (
    <section className="scroll-mt-28 py-20 md:py-28" id="progress">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.features.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.features.title}</LandingCopy>
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
                <div aria-hidden="true" className={`absolute -end-12 -top-12 size-40 rounded-full border-[24px] ${dark ? 'border-white/5' : 'border-[#D4AF37]/10'}`} />
                <div className="relative flex h-full min-w-0 flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`flex size-12 items-center justify-center rounded-2xl ${dark ? 'bg-white/10 text-[#E7CD78]' : 'bg-white text-[#084B2B]'}`}><Icon aria-hidden="true" className="size-5" /></span>
                    {available ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 px-3 py-1 text-[9px] font-black uppercase tracking-wide">
                        <span aria-hidden="true" className="relative flex size-2 shrink-0">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                        </span>
                        <LandingCopy className={dark ? 'text-[#E7CD78]' : 'text-[#8A6A16]'}>{{ en: 'Available', ar: 'متاح' }}</LandingCopy>
                      </span>
                    ) : null}
                  </div>
                  <LandingCopy as="h3" className={`mt-8 text-2xl font-black ${dark ? 'text-white' : 'text-[#042D1A]'}`}>{item.title}</LandingCopy>
                  <LandingCopy as="p" className={`mt-2 text-base font-black ${dark ? 'text-[#F4E8B7]' : 'text-[#0F6E41]'}`}>{item.description}</LandingCopy>
                  <LandingCopy as="p" className={`mt-4 max-w-xl text-sm leading-7 ${dark ? 'text-emerald-100/65' : 'text-slate-600'}`}>{item.detail}</LandingCopy>
                  {item.id === 'assessment' ? <div className="mt-auto pt-6" aria-label="Static mathematical notation sample"><div className="rounded-2xl border border-white/10 bg-white/10 p-4 font-mono text-sm text-white">x² + 5x + 6 = (x + 2)(x + 3)</div></div> : null}
                  {item.id === 'parents' ? <div className="mt-auto grid grid-cols-3 gap-2 pt-6" aria-hidden="true">{[{ label: 'Attend', width: 'w-full' }, { label: 'Practice', width: 'w-4/5' }, { label: 'Assess', width: 'w-3/5' }].map((bar) => <div className="rounded-xl bg-white/70 p-2" key={bar.label}><span className="block text-[8px] font-black uppercase text-slate-500">{bar.label}</span><span className={`mt-2 block h-1.5 rounded-full bg-[#0F6E41] ${bar.width}`} /></div>)}</div> : null}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <WhatsAppLink className="landing-cta inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-950/12 bg-white/85 px-6 text-sm font-black text-[#084B2B] shadow-lg shadow-emerald-950/5 ring-1 ring-white/70 outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#D4AF37] hover:bg-[#FBF6E2] hover:shadow-xl hover:shadow-[#D4AF37]/10 focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="preview_lesson_click" intent="freeLesson" label="learning_experience">
            {{ en: 'Preview Lesson', ar: 'شاهد حصة تجريبية' }}
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}
