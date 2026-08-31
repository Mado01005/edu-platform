'use client';

import { Languages } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LANGUAGE_PREFERENCE_KEY,
  resolveLocale,
} from '@/lib/i18n';
import type { Locale } from '@/lib/landing/types';
import { cn } from '@/lib/utils';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.locale = nextLocale;
    window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, nextLocale);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${LANGUAGE_PREFERENCE_KEY}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    const timer = window.setTimeout(
      () => setLocale(resolveLocale(saved, initialLocale)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [initialLocale, setLocale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === 'en' ? 'ar' : 'en'),
    }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider.');
  return value;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage();

  return (
    <button
      aria-label={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-border bg-brand-base px-3 text-xs font-extrabold text-brand-gold outline-none hover:border-brand-gold hover:text-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        className,
      )}
      onClick={toggleLocale}
      type="button"
    >
      <Languages aria-hidden="true" className="size-4" />
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}

export function LocalizedCopy({
  ar,
  en,
  className,
}: {
  ar: ReactNode;
  en: ReactNode;
  className?: string;
}) {
  const { locale } = useLanguage();
  return (
    <span className={className} dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      {locale === 'ar' ? ar : en}
    </span>
  );
}
