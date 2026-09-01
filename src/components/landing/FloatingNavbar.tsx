'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConversionLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import { trackLandingEvent } from '@/lib/landing/analytics';
import { landingContent } from '@/lib/landing/content';
import { getWhatsAppUrl, siteConfig } from '@/lib/siteConfig';

const contactUsLabel = {
  en: 'Contact Us',
  ar: 'تواصل معنا',
} as const;

export function FloatingNavbar() {
  const { locale, setLocale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const changeLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    setLocale(nextLocale);
    trackLandingEvent('language_toggle', { locale: nextLocale });
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5" data-scrolled={scrolled}>
      <div
        className={`mx-auto w-full max-w-7xl rounded-[1.4rem] border px-3 py-2 backdrop-blur-xl transition-colors sm:px-4 ${
          scrolled
            ? 'border-brand-base/10 bg-white/95 shadow-[0_8px_28px_rgba(10,52,37,0.12)]'
            : 'border-brand-base/10 bg-brand-ivory/92'
        }`}
      >
        <div className="flex min-h-12 items-center justify-between gap-2">
          <Link
            aria-label={siteConfig.title}
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30"
            href={siteConfig.routes.home}
          >
            <Image
              alt="Oqool Academy official crest"
              className="size-10 rounded-xl object-cover"
              height={48}
              priority
              src={siteConfig.brand.logo}
              width={48}
            />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-black text-brand-base">Oqool Academy</span>
              <span className="block font-arabic text-[11px] font-bold text-brand-gold" dir="rtl" lang="ar">أكاديمية عقول</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
            {landingContent.navigation.map((item) => (
              <a
                className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25"
                href={item.href}
                key={item.href}
              >
                <LandingCopy>{item.label}</LandingCopy>
              </a>
            ))}
            <Link
              className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25"
              href="/support"
            >
              <LandingCopy>{contactUsLabel}</LandingCopy>
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              aria-label={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand-base/10 bg-white px-2.5 text-xs font-black text-brand-base outline-none hover:border-brand-gold hover:bg-brand-gold/10 focus-visible:ring-4 focus-visible:ring-brand-gold/30 sm:px-3"
              onClick={changeLanguage}
              type="button"
            >
              {locale === 'en' ? 'العربية' : 'EN'}
            </button>
            <ConversionLink
              className="landing-cta hidden min-h-11 items-center justify-center gap-2 rounded-full bg-brand-gold px-4 text-xs font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_28px_rgba(229,184,92,0.24)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35 md:inline-flex"
              eventName="navbar_diagnostic_click"
              href={getWhatsAppUrl('diagnostic', locale)}
              label="navbar"
              newTab
              whatsapp
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              <LandingCopy>{landingContent.hero.primary}</LandingCopy>
            </ConversionLink>
            <button
              aria-controls="landing-mobile-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex size-11 items-center justify-center rounded-full border border-brand-base/10 bg-white text-brand-base outline-none hover:border-brand-gold hover:bg-brand-gold/10 focus-visible:ring-4 focus-visible:ring-brand-gold/25 lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="mt-2 grid gap-1 border-t border-brand-base/10 pt-2 lg:hidden"
            id="landing-mobile-menu"
          >
            {landingContent.navigation.map((item) => (
              <a
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-brand-surface outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <LandingCopy>{item.label}</LandingCopy>
              </a>
            ))}
            <Link
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-brand-surface outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25"
              href="/support"
              onClick={() => setMenuOpen(false)}
            >
              <LandingCopy>{contactUsLabel}</LandingCopy>
            </Link>
            <ConversionLink
              className="landing-cta mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 text-sm font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_28px_rgba(229,184,92,0.24)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35 md:hidden"
              eventName="navbar_diagnostic_click"
              href={getWhatsAppUrl('diagnostic', locale)}
              label="mobile_menu"
              newTab
              whatsapp
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              <LandingCopy>{landingContent.hero.primary}</LandingCopy>
            </ConversionLink>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
