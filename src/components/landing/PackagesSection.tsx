import { ArrowRight } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function PackagesSection() {
  const content = landingContent.packages;
  return (
    <section className="scroll-mt-28 bg-brand-ivory py-20 text-brand-base md:py-28" id="packages">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="border-s-2 border-brand-gold ps-3 text-sm font-extrabold tracking-normal text-brand-base">{content.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-base sm:text-5xl">{content.title}</LandingCopy>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="landing-card min-w-0 rounded-3xl border border-brand-mint-border bg-white p-6 shadow-sm sm:p-8">
            <LandingCopy as="h3" className="text-xl font-black text-brand-base">{content.exampleTitle}</LandingCopy>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-black text-brand-base">
              <LandingCopy className="rounded-full bg-brand-ivory-alt px-4 py-2">{content.from}</LandingCopy>
              <ArrowRight aria-hidden="true" className="size-5 text-brand-gold-bronze rtl:rotate-180" />
              <LandingCopy className="rounded-full bg-brand-ivory-alt px-4 py-2">{content.to}</LandingCopy>
            </div>
            <LandingCopy as="p" className="mt-5 text-sm leading-7 text-brand-surface/80">{content.exampleBody}</LandingCopy>
          </article>
          <article className="landing-card flex min-w-0 flex-col rounded-3xl border border-brand-gold/35 bg-white p-6 shadow-sm sm:p-8">
            <LandingCopy as="h3" className="text-xl font-black text-brand-base">{content.sizingTitle}</LandingCopy>
            <LandingCopy as="p" className="mt-4 text-sm leading-7 text-brand-surface/80">{content.sizingBody}</LandingCopy>
            <WhatsAppLink className="landing-cta inline-flex min-h-11 items-center font-black text-brand-base underline decoration-brand-gold decoration-2 underline-offset-4 outline-none hover:text-brand-gold-bronze focus-visible:ring-4 focus-visible:ring-brand-gold/30 rounded-md mt-6 self-start" eventName="whatsapp_click" intent="recommendation" label="packages_section">
              {content.cta}
            </WhatsAppLink>
          </article>
        </div>
      </div>
    </section>
  );
}
