import { BookMarked, Calculator, ClipboardCheck, Laptop2, MessageSquareText, Radio } from 'lucide-react';
import { ConversionLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';
import { landingFeatureFlags } from '@/lib/landing/featureFlags';
import { siteConfig } from '@/lib/siteConfig';

const visuals = { diagnostic: ClipboardCheck, assessment: Calculator, resources: BookMarked, devices: Laptop2, parents: MessageSquareText, live: Radio } as const;
const cardClasses = ['md:col-span-7 bg-white', 'md:col-span-5 bg-[#084B2B] text-white', 'md:col-span-5 bg-[#F1F5EF]', 'md:col-span-7 bg-white', 'md:col-span-7 bg-[#FBF6E2]', 'md:col-span-5 bg-[#042D1A] text-white'] as const;

export function LearningExperienceBento() {
  return (
    <section className="scroll-mt-28 py-20 sm:py-28" id="progress">
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
              <article className={`landing-card relative min-h-64 overflow-hidden rounded-3xl border border-emerald-950/10 p-6 hover:-translate-y-0.5 sm:p-8 ${cardClasses[index]}`} key={item.id}>
                <div aria-hidden="true" className={`absolute -end-12 -top-12 size-40 rounded-full border-[24px] ${dark ? 'border-white/5' : 'border-[#D4AF37]/10'}`} />
                <div className="relative flex h-full min-w-0 flex-col">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`flex size-12 items-center justify-center rounded-2xl ${dark ? 'bg-white/10 text-[#E7CD78]' : 'bg-white text-[#084B2B]'}`}><Icon aria-hidden="true" className="size-5" /></span>
                    {available ? <LandingCopy className={`rounded-full border border-[#D4AF37]/35 px-3 py-1 text-[9px] font-black uppercase tracking-wide ${dark ? 'text-[#E7CD78]' : 'text-[#8A6A16]'}`}>{{ en: 'Available', ar: 'متاح' }}</LandingCopy> : null}
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
          <ConversionLink className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-950/12 bg-white px-6 text-sm font-black text-[#084B2B] outline-none hover:border-[#D4AF37] hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-emerald-100" eventName="preview_lesson_click" href={siteConfig.routes.catalog} label="learning_experience">
            <LandingCopy>{{ en: 'Preview Lesson', ar: 'شاهد حصة تجريبية' }}</LandingCopy>
          </ConversionLink>
        </div>
      </div>
    </section>
  );
}

