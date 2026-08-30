import type { Locale } from '@/lib/landing/types';

const FALLBACK_WHATSAPP_NUMBER = '966596899362';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

const configuredWhatsAppNumber = digitsOnly(
  process.env.NEXT_PUBLIC_OQOOL_WHATSAPP_NUMBER ?? FALLBACK_WHATSAPP_NUMBER,
);

export const siteConfig = {
  name: 'Oqool Academy',
  arabicName: 'أكاديمية عقول',
  title: 'Oqool Academy | أكاديمية عقول',
  url: 'https://oqoolacademy.com',
  routes: {
    home: '/',
    privacy: '/privacy',
    support: '/support',
    terms: '/terms',
  },
  support: {
    email: 'support@oqoolacademy.com',
  },
  brand: {
    logo: '/brand/oqool-logo.png',
    banner: '/brand/oqool-banner.png',
  },
  whatsapp: {
    number: configuredWhatsAppNumber || FALLBACK_WHATSAPP_NUMBER,
    supportLines: [
      {
        id: 'egypt-primary',
        number: '201555920686',
        displayNumber: '+20 155 592 0686',
        label: { en: 'Egypt support line 1', ar: 'خط الدعم في مصر ١' },
      },
      {
        id: 'egypt-secondary',
        number: '201024991857',
        displayNumber: '+20 102 499 1857',
        label: { en: 'Egypt support line 2', ar: 'خط الدعم في مصر ٢' },
      },
      {
        id: 'saudi',
        number: '966596899362',
        displayNumber: '+966 59 689 9362',
        label: { en: 'Saudi Arabia support', ar: 'الدعم في السعودية' },
      },
    ],
    messages: {
      diagnostic: {
        en: 'Hello Oqool Academy, I would like to book a free diagnostic assessment for my child.',
        ar: 'مرحبًا أكاديمية عقول، أود حجز تقييم تشخيصي مجاني لابني.',
      },
      freeLesson: {
        en: "Hello Oqool Academy, I would like to arrange my child’s free first lesson.",
        ar: 'مرحبًا أكاديمية عقول، أود ترتيب الحصة الأولى المجانية لابني.',
      },
      recommendation: {
        en: 'Hello Oqool Academy, I would like a personalized learning recommendation for my child.',
        ar: 'مرحبًا أكاديمية عقول، أود الحصول على توصية تعليمية مخصصة لابني.',
      },
      support: {
        en: 'Hello Oqool Academy, I need help and would like to speak with your support team.',
        ar: 'مرحبًا أكاديمية عقول، أحتاج إلى المساعدة وأود التواصل مع فريق الدعم.',
      },
    },
  },
} as const;

export type WhatsAppIntent = keyof typeof siteConfig.whatsapp.messages;
export type SupportWhatsAppLine = (typeof siteConfig.whatsapp.supportLines)[number];

export function getWhatsAppUrl(intent: WhatsAppIntent, locale: Locale) {
  const message = siteConfig.whatsapp.messages[intent][locale];
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function getSupportWhatsAppUrl(
  line: SupportWhatsAppLine,
  locale: Locale,
) {
  const message = siteConfig.whatsapp.messages.support[locale];
  return `https://wa.me/${line.number}?text=${encodeURIComponent(message)}`;
}
