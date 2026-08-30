import { DEFAULT_LOCALE, resolveLocale } from '@/lib/i18n';
import { getWhatsAppUrl, siteConfig } from '@/lib/siteConfig';

describe('landing locale and contact configuration', () => {
  test('defaults first visits and invalid preferences to Arabic', () => {
    expect(DEFAULT_LOCALE).toBe('ar');
    expect(resolveLocale(undefined)).toBe('ar');
    expect(resolveLocale(null)).toBe('ar');
    expect(resolveLocale('unsupported')).toBe('ar');
    expect(resolveLocale('en')).toBe('en');
  });

  test.each(['en', 'ar'] as const)(
    'builds the localized %s support WhatsApp destination from centralized configuration',
    (locale) => {
      const destination = new URL(getWhatsAppUrl('support', locale));

      expect(destination.origin).toBe('https://wa.me');
      expect(destination.pathname).toBe(`/${siteConfig.whatsapp.number}`);
      expect(destination.searchParams.get('text')).toBe(
        siteConfig.whatsapp.messages.support[locale],
      );
    },
  );
});
