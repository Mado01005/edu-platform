import type { Locale } from '@/lib/landing/types';
import { siteConfig } from '@/lib/siteConfig';

export const DEFAULT_LOCALE: Locale = 'en';
export const LANGUAGE_PREFERENCE_KEY = 'oqool-locale-v1';
/** Request header the proxy sets when a URL fixes its own language (e.g. /ar). */
export const ROUTE_LOCALE_HEADER = 'x-nudrek-route-locale';

export function resolveLocale(
  value: string | null | undefined,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  return value === 'en' || value === 'ar' ? value : fallback;
}

/** Path of the public landing page for a locale. */
export function landingPath(locale: Locale): string {
  return locale === 'ar' ? siteConfig.routes.arabicHome : siteConfig.routes.home;
}

/** Locale fixed by a landing URL, or null when the URL does not fix one. */
export function landingLocaleForPath(pathname: string): Locale | null {
  if (pathname === siteConfig.routes.arabicHome) return 'ar';
  if (pathname === siteConfig.routes.home) return 'en';
  return null;
}

/** hreflang map shared by both landing pages. */
export const landingAlternates = {
  en: `${siteConfig.url}${siteConfig.routes.home}`,
  ar: `${siteConfig.url}${siteConfig.routes.arabicHome}`,
  'x-default': `${siteConfig.url}${siteConfig.routes.home}`,
} as const;
