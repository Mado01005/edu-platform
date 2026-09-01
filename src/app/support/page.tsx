import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock3,
  Headphones,
  Mail,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { LanguageToggle } from '@/components/i18n/language-provider';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SocialLinks } from '@/components/social/SocialLinks';
import { SupportChannels } from '@/components/support/SupportChannels';
import { SupportContactForm } from '@/components/support/SupportContactForm';
import { siteConfig } from '@/lib/siteConfig';

const description =
  'Contact Oqool Academy support through WhatsApp, email, or a secure in-page support form.';

export const metadata: Metadata = {
  title: 'Support Center | Oqool Academy',
  description,
  alternates: { canonical: `${siteConfig.url}${siteConfig.routes.support}` },
  openGraph: {
    title: 'Support Center | مركز الدعم — Oqool Academy',
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
  name: 'Oqool Academy Support Center',
  url: `${siteConfig.url}${siteConfig.routes.support}`,
  mainEntity: {
    '@type': 'EducationalOrganization',
    contactPoint: siteConfig.whatsapp.supportLines.map((line) => ({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: `+${line.number}`,
    })),
    email: siteConfig.support.email,
    name: siteConfig.name,
  },
};

export default function PublicSupportPage() {
  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-brand-base text-brand-white">
      <a className="sr-only z-[100] rounded-lg bg-brand-gold px-4 py-3 font-bold text-brand-base focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#support-content">
        Skip to support content
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactPageSchema).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />

      <header className="sticky top-3 z-50 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-18 w-full items-center justify-between gap-3 rounded-full border border-gray-200/50 bg-white/90 px-3 shadow-md shadow-black/5 backdrop-blur-md transition-all duration-300 dark:border-emerald-500/15 dark:bg-[#0A3425]/90 sm:px-4">
          <Link
            aria-label="Oqool Academy home"
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30"
            href={siteConfig.routes.home}
          >
            <Image
              alt="Oqool Academy official crest"
              className="size-11 shrink-0 rounded-xl object-cover"
              height={44}
              priority
              src={siteConfig.brand.logo}
              width={44}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-black text-brand-base dark:text-brand-white">Oqool Academy</span>
              <span className="block truncate font-arabic text-[11px] font-bold text-brand-gold" dir="rtl" lang="ar">أكاديمية عقول</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden min-h-11 items-center gap-2 rounded-full px-3 text-xs font-black text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:text-brand-muted/80 dark:hover:text-brand-gold sm:inline-flex"
              href={siteConfig.routes.home}
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:-scale-x-100" />
              <LandingCopy>{{ en: 'Back to home', ar: 'العودة للرئيسية' }}</LandingCopy>
            </Link>
            <LanguageToggle className="min-h-11 rounded-full" />
          </div>
        </div>
      </header>

      <main id="support-content">
        <section className="relative isolate overflow-hidden border-b border-brand-rim">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(23,88,63,0.52),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(212,163,69,0.18),transparent_24%),linear-gradient(rgba(229,184,92,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(229,184,92,0.055)_1px,transparent_1px)] bg-[size:auto,auto,44px_44px,44px_44px]" />
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-24">
            <div className="min-w-0">
              <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-brand-rim bg-brand-surface px-4 text-xs font-black uppercase tracking-[0.14em] text-brand-gold">
                <Headphones aria-hidden="true" className="size-4" />
                <LandingCopy>{{ en: 'Human support, three direct lines', ar: 'دعم مباشر عبر ثلاثة خطوط' }}</LandingCopy>
              </p>
              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-brand-white sm:text-6xl lg:text-7xl">
                <LandingCopy>{{ en: 'Support Center', ar: 'مركز الدعم' }}</LandingCopy>
              </h1>
              <LandingCopy as="p" className="mt-6 max-w-2xl text-base leading-8 text-brand-muted/80 sm:text-lg">{{
                en: 'Choose a direct WhatsApp line for a quick conversation, or send a detailed message through the secure form below. Our team will follow up using the contact details you provide.',
                ar: 'اختر أحد خطوط واتساب للتواصل السريع، أو أرسل رسالة مفصلة عبر النموذج الآمن أدناه. سيتابع فريقنا معك باستخدام بيانات الاتصال التي تقدمها.',
              }}</LandingCopy>
            </div>

            <aside className="relative min-w-0 rounded-[2rem] border border-brand-rim bg-brand-surface p-6 text-brand-white shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-8">
              <span aria-hidden="true" className="absolute end-7 top-7 size-24 rounded-full border border-brand-gold/20" />
              <span aria-hidden="true" className="absolute end-12 top-12 size-14 rounded-full border border-brand-gold/25" />
              <Mail aria-hidden="true" className="size-7 text-brand-gold" />
              <LandingCopy as="h2" className="mt-8 text-2xl font-black">{{ en: 'Prefer email?', ar: 'تفضل البريد الإلكتروني؟' }}</LandingCopy>
              <LandingCopy as="p" className="mt-3 text-sm leading-7 text-brand-muted/70">{{
                en: 'Our support inbox is available for account questions, academic help, and follow-up documents.',
                ar: 'بريد الدعم متاح لأسئلة الحسابات، والمساعدة الأكاديمية، ومستندات المتابعة.',
              }}</LandingCopy>
              <a
                className="mt-7 inline-flex min-h-12 max-w-full items-center rounded-xl border border-brand-border bg-brand-base px-4 text-sm font-black text-brand-white outline-none hover:border-brand-gold hover:text-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold/30"
                href={`mailto:${siteConfig.support.email}`}
              >
                <span className="break-all" dir="ltr">{siteConfig.support.email}</span>
              </a>
            </aside>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="whatsapp-support-title">
          <div className="mb-8 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-gold">
                <LandingCopy>{{ en: 'Direct support switchboard', ar: 'خطوط الدعم المباشر' }}</LandingCopy>
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-brand-white sm:text-4xl" id="whatsapp-support-title">
                <LandingCopy>{{ en: 'Choose the line that suits you.', ar: 'اختر خط التواصل المناسب لك.' }}</LandingCopy>
              </h2>
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-muted/70">
              <MessageCircle aria-hidden="true" className="size-4 text-brand-gold" />
              <LandingCopy>{{ en: 'WhatsApp opens in a new tab', ar: 'يفتح واتساب في علامة تبويب جديدة' }}</LandingCopy>
            </p>
          </div>
          <SupportChannels />

          <div className="mt-10 flex min-w-0 flex-col gap-6 rounded-[2rem] border border-brand-rim bg-brand-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-gold">
                <LandingCopy>{{ en: 'Follow our community', ar: 'تابع مجتمعنا' }}</LandingCopy>
              </p>
              <LandingCopy as="h3" className="mt-2 text-2xl font-black tracking-tight text-brand-white">{{
                en: 'Stay connected beyond support.',
                ar: 'ابقَ على تواصل معنا بعد الدعم.',
              }}</LandingCopy>
              <LandingCopy as="p" className="mt-2 max-w-2xl text-sm leading-7 text-brand-muted/70">{{
                en: 'Follow Oqool Academy for learning guidance, academy updates, and community highlights.',
                ar: 'تابع أكاديمية عقول للحصول على إرشادات تعليمية، وآخر أخبار الأكاديمية، وأبرز أنشطة المجتمع.',
              }}</LandingCopy>
            </div>
            <SocialLinks className="shrink-0 sm:justify-end" />
          </div>
        </section>

        <section className="relative isolate overflow-hidden border-y border-brand-rim bg-brand-base" id="contact-form">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(23,88,63,0.52),transparent_28%),radial-gradient(circle_at_88%_86%,rgba(212,163,69,0.12),transparent_24%),linear-gradient(rgba(229,184,92,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(229,184,92,0.04)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:px-8">
            <div className="min-w-0 lg:sticky lg:top-24">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-gold">
                <LandingCopy>{{ en: 'Detailed support request', ar: 'طلب دعم مفصل' }}</LandingCopy>
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-brand-white sm:text-5xl">
                <LandingCopy>{{ en: 'Tell us what you need.', ar: 'أخبرنا بما تحتاج إليه.' }}</LandingCopy>
              </h2>
              <LandingCopy as="p" className="mt-5 text-sm leading-7 text-brand-muted/70 sm:text-base">{{
                en: 'Your message is stored securely for the Oqool support team. Required fields help us identify the right response channel.',
                ar: 'تُحفظ رسالتك بأمان لفريق دعم عقول. تساعدنا الحقول المطلوبة في اختيار وسيلة الرد المناسبة.',
              }}</LandingCopy>

              <ul className="mt-8 grid gap-4 text-sm text-brand-muted/75">
                <li className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface text-brand-gold"><ShieldCheck aria-hidden="true" className="size-4" /></span>
                  <span className="pt-1.5 font-bold"><LandingCopy>{{ en: 'Validated and rate-limited submission', ar: 'إرسال محمي بالتحقق وتحديد المعدل' }}</LandingCopy></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-rim bg-brand-surface text-brand-gold"><Clock3 aria-hidden="true" className="size-4" /></span>
                  <span className="pt-1.5 font-bold"><LandingCopy>{{ en: 'A reference appears immediately after submission', ar: 'يظهر رقم مرجعي فور الإرسال' }}</LandingCopy></span>
                </li>
              </ul>
            </div>

            <div className="min-w-0 rounded-[2rem] border border-brand-rim bg-brand-surface p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] ring-1 ring-brand-gold/10 sm:p-8 lg:p-10">
              <SupportContactForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
