import { ArrowRight, CheckCircle2, ClipboardList, Eye, RefreshCw } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent, verifiedTestimonials } from '@/lib/landing/content';

export function OutcomesSection() {
  return (
    <section className="scroll-mt-28 bg-[#F1F5EF] py-20 sm:py-28" id="outcomes">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.outcomes.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.outcomes.title}</LandingCopy>
          <LandingCopy as="p" className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">{landingContent.outcomes.description}</LandingCopy>
        </div>

        {verifiedTestimonials.length > 0 ? (
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {verifiedTestimonials.map((testimonial) => (
              <figure className="rounded-3xl border border-emerald-950/10 bg-white p-7" key={testimonial.id}>
                <LandingCopy as="blockquote" className="text-base font-bold leading-8 text-[#1A2E22]">{testimonial.quote}</LandingCopy>
                <LandingCopy as="figcaption" className="mt-5 text-xs font-black text-[#0F6E41]">{testimonial.attribution}</LandingCopy>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-12 overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white p-5 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#084B2B] text-[#E7CD78]"><Eye aria-hidden="true" className="size-5" /></span><LandingCopy as="h3" className="font-black text-[#042D1A]">{landingContent.outcomes.sampleLabel}</LandingCopy></div>
              <LandingCopy className="w-fit rounded-full border border-[#D4AF37]/40 bg-[#FBF6E2] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-[#8A6A16]">{{ en: 'Illustrative — no real student data', ar: 'توضيحي — لا يتضمن بيانات طالب حقيقي' }}</LandingCopy>
            </div>
            <ol className="mt-8 grid gap-3 md:grid-cols-5">
              {landingContent.outcomes.sequence.map((item, index) => (
                <li className="relative flex min-h-28 flex-col justify-between rounded-2xl bg-[#F7F8F4] p-4" key={item.en}>
                  <span className="text-xs font-black tabular-nums text-[#D4AF37]">0{index + 1}</span>
                  <LandingCopy className="mt-4 text-sm font-black leading-6 text-[#042D1A]">{item}</LandingCopy>
                  {index < landingContent.outcomes.sequence.length - 1 ? <ArrowRight aria-hidden="true" className="absolute -bottom-2.5 left-1/2 z-10 size-5 -translate-x-1/2 rounded-full bg-[#084B2B] p-1 text-white md:-right-2.5 md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2 rtl:md:-left-2.5 rtl:md:right-auto rtl:md:rotate-180" /> : null}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl bg-[#042D1A] p-6 text-white sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#E7CD78]"><ClipboardList aria-hidden="true" className="size-5" /></span>
            <LandingCopy as="h3" className="mt-6 text-2xl font-black sm:text-3xl">{landingContent.outcomes.teacherTitle}</LandingCopy>
            <LandingCopy as="p" className="mt-5 text-sm font-bold leading-7 text-[#F4E8B7]">{landingContent.outcomes.teacherDescription}</LandingCopy>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/5 p-4"><RefreshCw aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#E7CD78]" /><LandingCopy className="text-sm leading-7 text-emerald-100/75">{landingContent.outcomes.intervention}</LandingCopy></div>
          </article>

          <article className="rounded-3xl border border-[#D4AF37]/30 bg-[#FBF6E2] p-6 sm:p-8">
            <CheckCircle2 aria-hidden="true" className="size-9 text-[#084B2B]" />
            <LandingCopy as="h3" className="mt-6 text-2xl font-black text-[#042D1A]">{landingContent.pricing.title}</LandingCopy>
            <LandingCopy as="p" className="mt-4 text-sm leading-7 text-slate-600">{landingContent.pricing.description}</LandingCopy>
            <WhatsAppLink className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#084B2B] px-5 text-sm font-black text-white outline-none hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="whatsapp_click" intent="recommendation" label="pricing_recommendation">
              {landingContent.pricing.cta}
            </WhatsAppLink>
          </article>
        </div>
      </div>
    </section>
  );
}
