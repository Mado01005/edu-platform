import { NodrekEmblem } from '@/components/branding/NodrekBrand';
import { DiagnosticAssessmentLink, WhatsAppLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';
import { siteConfig } from '@/lib/siteConfig';

export function FinalCTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-mint-light px-4 py-20 text-brand-base sm:px-6 md:py-28 lg:px-8">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(162,205,159,0.16),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(213,168,72,0.18),transparent_26%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center overflow-hidden rounded-3xl border border-brand-rim bg-brand-surface px-5 py-14 text-center text-brand-white shadow-2xl shadow-black/30 backdrop-blur-md sm:px-10 sm:py-20">
        <div aria-hidden="true" className="absolute -left-20 -top-20 size-64 rounded-full border-[52px] border-brand-border/35" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-20 size-72 rounded-full border-[42px] border-brand-gold/10" />
        <span className="relative rounded-3xl bg-brand-mint-light p-2"><NodrekEmblem className="relative size-36 sm:size-44" sizes="(min-width: 640px) 176px, 144px" /></span>
        <p className="relative mt-3 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-brand-gold" dir="ltr">
          <span className="tracking-[0.12em]" lang="en">{siteConfig.tagline.en}</span>
          <span aria-hidden="true">|</span>
          <span className="font-arabic" dir="rtl" lang="ar">{siteConfig.tagline.ar}</span>
        </p>
        <LandingCopy className="relative mt-5 text-sm font-extrabold tracking-normal text-brand-gold">{landingContent.finalCta.eyebrow}</LandingCopy>
        <LandingCopy as="h2" className="relative mt-4 max-w-4xl text-balance text-3xl font-black tracking-tight sm:text-5xl">{landingContent.finalCta.title}</LandingCopy>
        <LandingCopy as="p" className="relative mt-5 max-w-2xl text-sm leading-7 text-brand-muted/80 sm:text-base">{landingContent.finalCta.description}</LandingCopy>
        <div className="relative mt-8 flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <DiagnosticAssessmentLink className="landing-cta inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-gold px-6 text-sm font-black text-brand-base shadow-md shadow-brand-gold/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_32px_rgba(222,182,94,0.26)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="final_diagnostic_click" label="final_diagnostic">
            {landingContent.finalCta.primary}
          </DiagnosticAssessmentLink>
          <WhatsAppLink className="landing-cta inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-brand-gold bg-brand-sage-deep px-6 text-sm font-black text-brand-base shadow-lg shadow-black/20 ring-1 ring-brand-rim outline-none backdrop-blur-md transition-all duration-300 hover:bg-brand-sage hover:shadow-[0_0_28px_rgba(222,182,94,0.16)] focus-visible:ring-4 focus-visible:ring-brand-gold/30" eventName="contact_whatsapp_click" intent="support" label="final_support">
            {landingContent.finalCta.secondary}
          </WhatsAppLink>
        </div>
        <LandingCopy className="relative mt-5 text-xs font-bold text-brand-muted/65">{landingContent.finalCta.note}</LandingCopy>
      </div>
    </section>
  );
}
