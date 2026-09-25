import { DEFAULT_LOCALE, resolveLocale } from '@/lib/i18n';
import {
  getSupportWhatsAppUrl,
  getWhatsAppUrl,
  siteConfig,
} from '@/lib/siteConfig';

describe('landing locale and contact configuration', () => {
  test('defaults first visits and invalid preferences to English while preserving Arabic choices', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale('unsupported')).toBe('en');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ar')).toBe('ar');
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

  test('provides the single support number with localized messages', () => {
    expect(siteConfig.whatsapp.number).toBe('201554225979');
    expect(siteConfig.whatsapp.supportLines.map((line) => line.number)).toEqual(['201554225979']);

    for (const line of siteConfig.whatsapp.supportLines) {
      for (const locale of ['en', 'ar'] as const) {
        const destination = new URL(getSupportWhatsAppUrl(line, locale));
        expect(destination.pathname).toBe(`/${line.number}`);
        expect(destination.searchParams.get('text')).toBe(
          siteConfig.whatsapp.messages.support[locale],
        );
      }
    }
  });
});
