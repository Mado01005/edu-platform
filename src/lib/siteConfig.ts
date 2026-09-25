import type { Locale } from '@/lib/landing/types';

const FALLBACK_WHATSAPP_NUMBER = '966596899362';

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

const configuredWhatsAppNumber = digitsOnly(
  process.env.NEXT_PUBLIC_NODREK_WHATSAPP_NUMBER
    ?? process.env.NEXT_PUBLIC_OQOOL_WHATSAPP_NUMBER
    ?? FALLBACK_WHATSAPP_NUMBER,
);

export const siteConfig = {
  name: 'Nodrek Learning Hub',
  arabicName: 'نُدرك للتعليم المتكامل',
  title: 'Nodrek Learning Hub | نُدرك للتعليم المتكامل',
  description: 'Managed learning, diagnostic assessments, and personalized education for grades 1–12.',
  tagline: { en: 'LEARN • GROW • ACHIEVE', ar: 'نتعلم • ننمو • ننجز' },
  copyright: '© 2026 Nodrek Learning Hub | نُدرك للتعليم المتكامل. All rights reserved.',
  url: 'https://www.oqoolacademy.com',
  routes: {
    home: '/',
    privacy: '/privacy',
    support: '/support',
    terms: '/terms',
  },
  support: {
    email: 'Support@nodrekhub.com',
    sender: 'Nodrek Support <Support@nodrekhub.com>',
  },
  brand: {
    logo: '/brand/nodrek-emblem.png',
    appIcon: '/brand/nodrek-logo.png',
    banner: '/brand/nodrek-banner.jpeg',
    bannerWidth: 1126,
    bannerHeight: 496,
  },
  whatsapp: {
    number: configuredWhatsAppNumber || FALLBACK_WHATSAPP_NUMBER,
    supportLines: [
      {
        id: 'saudi',
        number: '966596899362',
        displayNumber: '+966 59 689 9362',
        label: { en: 'Saudi Arabia Support', ar: 'الدعم في السعودية' },
      },
      {
        id: 'egypt-primary',
        number: '201554225979',
        displayNumber: '+20 155 422 5979',
        internationalNumber: '00201554225979',
        label: { en: 'Egypt Support', ar: 'خط دعم مصر' },
      },
    ],
    messages: {
      diagnostic: {
        en: 'Hello Nodrek Learning Hub, I would like to book a free diagnostic assessment for my child.',
        ar: 'مرحبًا نُدرك للتعليم المتكامل، أود حجز تقييم تشخيصي مجاني لابني.',
      },
      freeLesson: {
        en: "Hello Nodrek Learning Hub, I would like to arrange my child’s free first lesson.",
        ar: 'مرحبًا نُدرك للتعليم المتكامل، أود ترتيب الحصة الأولى المجانية لابني.',
      },
      recommendation: {
        en: 'Hello Nodrek Learning Hub, I would like a personalized learning recommendation for my child.',
        ar: 'مرحبًا نُدرك للتعليم المتكامل، أود الحصول على توصية تعليمية مخصصة لابني.',
      },
      support: {
        en: 'Hello Nodrek Learning Hub, I need help and would like to speak with your support team.',
        ar: 'مرحبًا نُدرك للتعليم المتكامل، أحتاج إلى المساعدة وأود التواصل مع فريق الدعم.',
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
