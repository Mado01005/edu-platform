import type { Locale } from '@/lib/landing/types';

const FALLBACK_WHATSAPP_NUMBER = '201025272693';

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
    login: '/lms/login',
    catalog: '/catalog',
    privacy: '/privacy',
    terms: '/terms',
  },
  brand: {
    logo: '/brand/oqool-logo.png',
    banner: '/brand/oqool-banner.png',
  },
  whatsapp: {
    number: configuredWhatsAppNumber || FALLBACK_WHATSAPP_NUMBER,
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
    },
  },
} as const;

export type WhatsAppIntent = keyof typeof siteConfig.whatsapp.messages;

export function getWhatsAppUrl(intent: WhatsAppIntent, locale: Locale) {
  const message = siteConfig.whatsapp.messages[intent][locale];
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

