'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConversionLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import { SocialLinks } from '@/components/social/SocialLinks';
import { trackLandingEvent } from '@/lib/landing/analytics';
import { landingContent } from '@/lib/landing/content';
import { getWhatsAppUrl, siteConfig } from '@/lib/siteConfig';

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
      className={`oqool-auto-hide-navbar sticky top-3 z-50 mx-auto max-w-7xl transform-gpu px-4 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform sm:px-6 ${navbarVisible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}
    >
      <div
        className={`w-full border border-gray-200/50 bg-white/90 px-3 py-2 shadow-md shadow-black/5 backdrop-blur-md transition-all duration-300 dark:border-emerald-500/15 dark:bg-[#0A3425]/90 sm:px-4 ${menuOpen ? 'rounded-[1.4rem]' : 'rounded-full'}`}
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
              <span className="block text-sm font-black text-brand-base dark:text-brand-white">Oqool Academy</span>
              <span className="block font-arabic text-[11px] font-bold text-brand-gold" dir="rtl" lang="ar">أكاديمية عقول</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
            {landingContent.navigation.map((item) => (
              <a
                className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:text-brand-muted/80 dark:hover:text-brand-gold"
                href={item.href}
                key={item.href}
              >
                <LandingCopy>{item.label}</LandingCopy>
              </a>
            ))}
            <Link
              className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-extrabold text-brand-surface/80 outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:text-brand-muted/80 dark:hover:text-brand-gold"
              href="/support"
            >
              <LandingCopy>{contactUsLabel}</LandingCopy>
            </Link>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              aria-label={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand-base/10 bg-white px-2.5 text-xs font-black text-brand-base outline-none hover:border-brand-gold hover:bg-brand-gold/10 focus-visible:ring-4 focus-visible:ring-brand-gold/30 dark:border-emerald-500/15 dark:bg-brand-base dark:text-brand-gold sm:px-3"
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
              className="inline-flex size-11 items-center justify-center rounded-full border border-brand-base/10 bg-white text-brand-base outline-none hover:border-brand-gold hover:bg-brand-gold/10 focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:border-emerald-500/15 dark:bg-brand-base dark:text-brand-gold lg:hidden"
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
            className="mt-2 grid gap-1 border-t border-brand-base/10 pt-2 dark:border-white/10 lg:hidden"
            id="landing-mobile-menu"
          >
            {landingContent.navigation.map((item) => (
              <a
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-brand-surface outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:text-brand-muted dark:hover:text-brand-gold"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <LandingCopy>{item.label}</LandingCopy>
              </a>
            ))}
            <Link
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-brand-surface outline-none hover:bg-brand-gold/10 hover:text-brand-base focus-visible:ring-4 focus-visible:ring-brand-gold/25 dark:text-brand-muted dark:hover:text-brand-gold"
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
            <div className="mt-3 border-t border-brand-base/10 pt-3 dark:border-white/10">
              <LandingCopy className="block text-center text-[10px] font-black uppercase tracking-[0.16em] text-brand-surface/60 dark:text-brand-muted/65">{{
                en: 'Follow Oqool Academy',
                ar: 'تابع أكاديمية عقول',
              }}</LandingCopy>
              <SocialLinks className="mt-2 justify-center" />
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
