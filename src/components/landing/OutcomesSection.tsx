import { ArrowRight, CheckCircle2, ClipboardList, Eye, RefreshCw } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent, verifiedTestimonials } from '@/lib/landing/content';

export function OutcomesSection() {
  return (
    <section className="scroll-mt-28 bg-[#F1F5EF] py-20 md:py-28" id="outcomes">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.outcomes.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.outcomes.title}</LandingCopy>
          <LandingCopy as="p" className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">{landingContent.outcomes.description}</LandingCopy>
        </div>

        {verifiedTestimonials.length > 0 ? (
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {verifiedTestimonials.map((testimonial) => (
              <figure className="landing-card rounded-3xl border border-emerald-500/15 bg-white/80 p-7 shadow-xl shadow-emerald-950/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/10" key={testimonial.id}>
                <LandingCopy as="blockquote" className="text-base font-bold leading-8 text-[#1A2E22]">{testimonial.quote}</LandingCopy>
                <LandingCopy as="figcaption" className="mt-5 text-xs font-black text-[#0F6E41]">{testimonial.attribution}</LandingCopy>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-12 overflow-hidden rounded-3xl border border-emerald-500/15 bg-emerald-950/50 p-5 text-white shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
            <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#E7CD78]"><Eye aria-hidden="true" className="size-5" /></span><LandingCopy as="h3" className="font-black text-white">{landingContent.outcomes.sampleLabel}</LandingCopy></div>
            <ol className="mt-8 grid gap-3 md:grid-cols-5">
              {landingContent.outcomes.sequence.map((item, index) => (
                <li className="landing-card relative flex min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-lg shadow-black/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/10" key={item.en}>
                  <span className="text-xs font-black tabular-nums text-[#D4AF37]">0{index + 1}</span>
                  <LandingCopy className="mt-4 text-sm font-black leading-6 text-white">{item}</LandingCopy>
                  {index < landingContent.outcomes.sequence.length - 1 ? <ArrowRight aria-hidden="true" className="absolute -bottom-2.5 left-1/2 z-10 size-5 -translate-x-1/2 rounded-full bg-[#084B2B] p-1 text-white md:-right-2.5 md:bottom-auto md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2 rtl:md:-left-2.5 rtl:md:right-auto rtl:md:rotate-180" /> : null}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="landing-card rounded-3xl border border-emerald-500/15 bg-emerald-950/50 p-6 text-white shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#E7CD78]"><ClipboardList aria-hidden="true" className="size-5" /></span>
            <LandingCopy as="h3" className="mt-6 text-2xl font-black sm:text-3xl">{landingContent.outcomes.teacherTitle}</LandingCopy>
            <LandingCopy as="p" className="mt-5 text-sm font-bold leading-7 text-[#F4E8B7]">{landingContent.outcomes.teacherDescription}</LandingCopy>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/5 p-4"><RefreshCw aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#E7CD78]" /><LandingCopy className="text-sm leading-7 text-emerald-100/75">{landingContent.outcomes.intervention}</LandingCopy></div>
          </article>

          <article className="landing-card rounded-3xl border border-[#D4AF37]/30 bg-[#FBF6E2]/80 p-6 shadow-xl shadow-[#D4AF37]/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4AF37]/15 sm:p-8">
            <CheckCircle2 aria-hidden="true" className="size-9 text-[#084B2B]" />
            <LandingCopy as="h3" className="mt-6 text-2xl font-black text-[#042D1A]">{landingContent.pricing.title}</LandingCopy>
            <LandingCopy as="p" className="mt-4 text-sm leading-7 text-slate-600">{landingContent.pricing.description}</LandingCopy>
            <WhatsAppLink className="landing-cta mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#084B2B] px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/15 ring-1 ring-white/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-[#0F6E41] hover:shadow-[0_0_32px_rgba(16,185,129,0.28)] focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="whatsapp_click" intent="recommendation" label="pricing_recommendation">
              {landingContent.pricing.cta}
            </WhatsAppLink>
          </article>
        </div>
      </div>
    </section>
  );
}
