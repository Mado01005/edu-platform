import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { LanguageToggle } from '@/components/i18n/language-provider';
import { NodrekLogo } from '@/components/brand/NodrekLogo';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SocialLinks } from '@/components/social/SocialLinks';
import { SupportContactForm } from '@/components/support/SupportContactForm';
import { siteConfig } from '@/lib/siteConfig';

const description =
  'Contact Nodrek Learning Hub support through WhatsApp, email, or a secure in-page support form.';

export const metadata: Metadata = {
  title: 'Support Center',
  description,
  alternates: { canonical: `${siteConfig.url}${siteConfig.routes.support}` },
  openGraph: {
    title: 'Support Center | مركز الدعم — Nodrek Learning Hub',
    description,
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    siteName: siteConfig.name,
    type: 'website',
    url: `${siteConfig.url}${siteConfig.routes.support}`,
  },
};

const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Nodrek Learning Hub Support Center',
  url: `${siteConfig.url}${siteConfig.routes.support}`,
  mainEntity: {
    '@type': 'EducationalOrganization',
    '@id': `${siteConfig.url}/#organization`,
  },
};

export default function PublicSupportPage() {
  const egyptLine = siteConfig.whatsapp.supportLines[0];

  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-brand-base text-brand-white">
      <a className="sr-only z-[100] rounded-lg bg-brand-gold px-4 py-3 font-bold text-brand-base focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#support-content">
        Skip to support content
      </a>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema).replace(/</g, '\\u003c') }} type="application/ld+json" />

      <header className="sticky top-3 z-50 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-18 w-full items-center justify-between gap-3 rounded-full border border-brand-mint-border/60 bg-white/90 px-3 shadow-sm backdrop-blur-md sm:px-4">
          <NodrekLogo size="md" />
          <div className="flex shrink-0 items-center gap-2">
            <Link className="hidden min-h-11 items-center gap-2 rounded-full px-3 text-xs font-black text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 sm:inline-flex" href={siteConfig.routes.home}>
              <ArrowLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
              <LandingCopy>{{ en: 'Back to home', ar: 'العودة للرئيسية' }}</LandingCopy>
            </Link>
            <LanguageToggle className="min-h-11 rounded-full" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pt-12" id="support-content">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-brand-white sm:text-5xl">
            <LandingCopy>{{ en: 'Contact Us', ar: 'تواصل معنا' }}</LandingCopy>
          </h1>
          <LandingCopy as="p" className="mt-3 text-sm leading-6 text-brand-muted/80 sm:text-base">{{
            en: 'Choose a direct contact option or send your question below.',
            ar: 'اختر وسيلة تواصل مباشرة أو أرسل سؤالك أدناه.',
          }}</LandingCopy>
        </div>

        <div className="mx-auto mb-8 mt-8 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-brand-border bg-brand-surface p-5" aria-labelledby="whatsapp-contact-title">
            <MessageCircle aria-hidden="true" className="size-6 text-brand-gold" />
            <h2 className="mt-3 text-lg font-black" id="whatsapp-contact-title">WhatsApp</h2>
            <p className="mt-1 text-sm font-bold text-brand-muted" dir="ltr">{egyptLine.displayNumber}</p>
            <a className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-gold px-4 text-sm font-black text-brand-base outline-none hover:bg-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold/30" href={`https://wa.me/${egyptLine.number}`} rel="noopener noreferrer" target="_blank">
              <LandingCopy>{{ en: 'Chat on WhatsApp', ar: 'تحدث عبر واتساب' }}</LandingCopy>
            </a>
          </section>
          <section className="min-w-0 rounded-2xl border border-brand-border bg-brand-surface p-5" aria-labelledby="email-contact-title">
            <Mail aria-hidden="true" className="size-6 text-brand-gold" />
            <h2 className="mt-3 text-lg font-black" id="email-contact-title"><LandingCopy>{{ en: 'Email', ar: 'البريد الإلكتروني' }}</LandingCopy></h2>
            <p className="mt-1 break-all text-sm font-bold text-brand-muted" dir="ltr">{siteConfig.support.email}</p>
            <a className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-brand-gold px-4 text-sm font-black text-brand-gold outline-none hover:bg-brand-gold/10 focus-visible:ring-4 focus-visible:ring-brand-gold/30" href={`mailto:${siteConfig.support.email}`}>
              <LandingCopy>{{ en: 'Send Email', ar: 'أرسل بريدًا إلكترونيًا' }}</LandingCopy>
            </a>
          </section>
        </div>

        <section className="mx-auto max-w-2xl rounded-2xl border border-brand-rim bg-brand-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7" id="contact-form" aria-labelledby="support-form-title">
          <h2 className="text-xl font-black" id="support-form-title"><LandingCopy>{{ en: 'Send a message', ar: 'أرسل رسالة' }}</LandingCopy></h2>
          <LandingCopy as="p" className="mb-5 mt-1 text-sm text-brand-muted/75">{{ en: 'Tell us how we can help.', ar: 'أخبرنا كيف يمكننا مساعدتك.' }}</LandingCopy>
          <SupportContactForm />
        </section>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start">
          <LandingCopy as="p" className="text-sm font-bold text-brand-muted/75">{{ en: 'Follow the Nodrek community', ar: 'تابع مجتمع نُدرك' }}</LandingCopy>
          <SocialLinks className="justify-center" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
