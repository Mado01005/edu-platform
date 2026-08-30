import type { Locale } from '@/lib/landing/types';

export const DEFAULT_LOCALE: Locale = 'ar';
export const LANGUAGE_PREFERENCE_KEY = 'oqool-locale-v1';

export function resolveLocale(
  value: string | null | undefined,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  return value === 'en' || value === 'ar' ? value : fallback;
}
