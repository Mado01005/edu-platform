import { siteConfig as brandConfig } from '@/lib/siteConfig';

export const siteConfig = {
  platformName: brandConfig.title,
  name: brandConfig.name,
  nameArabic: brandConfig.arabicName,
  title: brandConfig.title,
  slogan: brandConfig.tagline.en,
  sloganArabic: brandConfig.tagline.ar,
  mottoRibbon: brandConfig.tagline.en,
  motto: [
    { icon: '🌐', label: 'LEARN', labelArabic: 'نتعلم' },
    { icon: '⭐', label: 'GROW', labelArabic: 'ننمو' },
    { icon: '🎯', label: 'ACHIEVE', labelArabic: 'ننجز' },
  ],
  support: {
    email: brandConfig.support.email,
    phone: `+${brandConfig.whatsapp.supportLines[0].number}`,
    whatsappUrl: `https://wa.me/${brandConfig.whatsapp.supportLines[0].number}`,
  },
  values: [
    {
      icon: '🧠',
      title: 'Smart Learning',
      titleArabic: 'تعلم ذكي',
      description: 'Structured milestone modules and guided mastery.',
      descriptionArabic: 'وحدات مرحلية منظمة ومسار إتقان موجّه.',
    },
    {
      icon: '👨‍🏫',
      title: 'Expert Teachers',
      titleArabic: 'معلمون خبراء',
      description: 'Top-tier verified secondary and STEM instructors.',
      descriptionArabic: 'نخبة من معلمي المرحلة الثانوية ومواد STEM الموثّقين.',
    },
    {
      icon: '🎬',
      title: 'Interactive Curriculum',
      titleArabic: 'مناهج تفاعلية',
      description: 'High-definition lectures and a KaTeX exam engine.',
      descriptionArabic: 'محاضرات عالية الدقة ومحرك اختبارات KaTeX تفاعلي.',
    },
    {
      icon: '📈',
      title: 'Real Progress',
      titleArabic: 'متابعة ونتائج حقيقية',
      description: 'Dedicated parent tracking and WhatsApp reports.',
      descriptionArabic: 'متابعة مخصصة لولي الأمر وتقارير عبر واتساب.',
    },
  ],
} as const;
