'use client';

import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/components/i18n/language-provider';
import {
  getSupportWhatsAppUrl,
  siteConfig,
} from '@/lib/siteConfig';

export function SupportChannels() {
  const { locale } = useLanguage();

  return (
    <ol className="relative grid min-w-0 gap-4 lg:grid-cols-3">
      <span
        aria-hidden="true"
        className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-gold/55 to-transparent lg:block"
      />
      {siteConfig.whatsapp.supportLines.map((line, index) => (
        <li className="relative min-w-0" key={line.id}>
          <a
            className="group flex min-h-44 min-w-0 flex-col rounded-[1.55rem] border border-brand-border bg-brand-surface p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] outline-none transition hover:-translate-y-1 hover:border-brand-gold hover:shadow-[0_22px_55px_rgba(0,0,0,0.3)] focus-visible:ring-4 focus-visible:ring-brand-gold/30"
            href={getSupportWhatsAppUrl(line, locale)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="flex items-start justify-between gap-4">
              <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-base text-brand-gold shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                <MessageCircle aria-hidden="true" className="size-6" />
                <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-brand-surface bg-brand-gold text-[10px] font-black text-brand-base" dir="ltr">
                  {index + 1}
                </span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-brand-muted/55 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-gold rtl:-scale-x-100" />
            </span>
            <span className="mt-5 block text-sm font-black text-brand-white">
              {line.label[locale]}
            </span>
            <span className="mt-1 block text-lg font-black tracking-tight text-brand-gold" dir="ltr">
              {line.displayNumber}
            </span>
            <span className="mt-auto pt-4 text-xs font-bold text-brand-muted/70">
              {locale === 'ar' ? 'ابدأ محادثة واتساب' : 'Start a WhatsApp chat'}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
