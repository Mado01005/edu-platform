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
import { cn } from '@/lib/utils';

type Locale = 'en' | 'ar';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const STORAGE_KEY = 'oqool-locale-v1';
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.locale = nextLocale;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const timer = window.setTimeout(
      () => setLocale(saved === 'ar' ? 'ar' : 'en'),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [setLocale]);

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
        'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 text-xs font-extrabold text-[#084B2B] outline-none hover:border-[#D4AF37] hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-emerald-200',
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
