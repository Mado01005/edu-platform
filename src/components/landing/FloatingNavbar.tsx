'use client';

import Link from 'next/link';
import { ClipboardCheck, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NodrekEmblem } from '@/components/branding/NodrekBrand';
import { DiagnosticAssessmentLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import { SocialLinks } from '@/components/social/SocialLinks';
import { trackLandingEvent } from '@/lib/landing/analytics';
import { landingContent } from '@/lib/landing/content';
import { siteConfig } from '@/lib/siteConfig';

const contactUsLabel = {
  en: 'Contact Us',
  ar: 'تواصل معنا',
} as const;

const TOP_SCROLL_THRESHOLD = 20;
const DIRECTION_SCROLL_THRESHOLD = 8;

export function FloatingNavbar() {
  const { locale, setLocale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    lastScrollYRef.current = Math.max(window.scrollY, 0);

    const updateNavbarVisibility = () => {
      animationFrameRef.current = null;
      const currentScrollY = Math.max(window.scrollY, 0);

      if (currentScrollY < TOP_SCROLL_THRESHOLD) {
        setNavbarVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(scrollDelta) < DIRECTION_SCROLL_THRESHOLD) {
        return;
      }

      setNavbarVisible(scrollDelta < 0);
      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(
        updateNavbarVisibility,
      );
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const changeLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    setLocale(nextLocale);
    trackLandingEvent('language_toggle', { locale: nextLocale });
  };

  return (
    <header
      className={`nodrek-auto-hide-navbar sticky top-3 z-50 mx-auto max-w-7xl transform-gpu px-4 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform sm:px-6 ${navbarVisible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}
    >
      <div
        className={`w-full border border-brand-mint-border/60 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md transition-all duration-300 sm:px-4 ${menuOpen ? 'rounded-[1.4rem]' : 'rounded-full'}`}
      >
        <div className="flex min-h-12 items-center justify-between gap-2">
          <Link
            aria-label={siteConfig.title}
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30"
            href={siteConfig.routes.home}
          >
            <NodrekEmblem className="size-12" preload sizes="48px" />
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-black text-brand-base">{siteConfig.name}</span>
              <span className="block font-arabic text-[11px] font-bold text-brand-base" dir="rtl" lang="ar">{siteConfig.arabicName}</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
            {landingContent.navigation.map((item) => (
              <a
                className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-base outline-none hover:bg-brand-gold/10 hover:text-brand-gold focus-visible:ring-4 focus-visible:ring-brand-gold/25"
                href={item.href}
                key={item.href}
              >
                <LandingCopy>{item.label}</LandingCopy>
              </a>
            ))}
            <Link
              className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-base outline-none hover:bg-brand-gold/10 hover:text-brand-gold focus-visible:ring-4 focus-visible:ring-brand-gold/25"
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
            <DiagnosticAssessmentLink
              before={<ClipboardCheck aria-hidden="true" className="size-4 shrink-0" />}
              className="landing-cta hidden min-h-11 items-center justify-center gap-2 rounded-full bg-brand-gold px-4 text-xs font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_28px_rgba(232,190,95,0.24)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35 md:inline-flex"
              eventName="navbar_diagnostic_click"
              label="navbar"
            >
              {landingContent.hero.primary}
            </DiagnosticAssessmentLink>
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
            <DiagnosticAssessmentLink
              before={<ClipboardCheck aria-hidden="true" className="size-4 shrink-0" />}
              className="landing-cta mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-gold px-4 text-sm font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_28px_rgba(232,190,95,0.24)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35 md:hidden"
              eventName="navbar_diagnostic_click"
              label="mobile_menu"
            >
              {landingContent.hero.primary}
            </DiagnosticAssessmentLink>
            <div className="mt-3 border-t border-brand-base/10 pt-3">
              <LandingCopy className="block text-center text-[10px] font-black uppercase tracking-[0.16em] text-brand-surface/60">{{
                en: 'Follow Nodrek Learning Hub',
                ar: 'تابع نُدرك للتعليم المتكامل',
              }}</LandingCopy>
              <SocialLinks className="mt-2 justify-center" />
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
