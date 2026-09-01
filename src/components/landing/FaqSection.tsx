'use client';

import { ChevronDown, HelpCircle } from 'lucide-react';
import { useId, useState } from 'react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { trackLandingEvent } from '@/lib/landing/analytics';
import { landingContent } from '@/lib/landing/content';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const idPrefix = useId();

  return (
    <section className="scroll-mt-28 bg-brand-ivory-alt py-20 text-brand-base md:py-28" id="faq">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <div className="max-w-lg">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gold text-brand-base"><HelpCircle aria-hidden="true" className="size-5" /></span>
          <LandingCopy className="mt-6 block border-s-2 border-brand-gold ps-3 text-xs font-black uppercase tracking-[0.18em] text-brand-base">{landingContent.faq.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-base sm:text-5xl">{landingContent.faq.title}</LandingCopy>
        </div>

        <div className="space-y-3">
          {landingContent.faq.items.map(([question, answer], index) => {
            const open = openIndex === index;
            const buttonId = `${idPrefix}-button-${index}`;
            const panelId = `${idPrefix}-panel-${index}`;
            return (
              <article className={`landing-card overflow-hidden rounded-3xl border bg-white shadow-xl shadow-brand-base/8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-base/10 ${open ? 'border-brand-gold/55' : 'border-brand-base/10'}`} key={question.en}>
                <h3>
                  <button aria-controls={panelId} aria-expanded={open} className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-start font-black text-brand-base outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-gold/30 sm:px-6" id={buttonId} onClick={() => { const next = open ? null : index; setOpenIndex(next); if (next !== null) trackLandingEvent('faq_open', { question: question.en }); }} type="button">
                    <span className="flex min-w-0 items-center gap-3"><span className="text-[10px] font-black text-brand-gold">0{index + 1}</span><LandingCopy>{question}</LandingCopy></span>
                    <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-brand-gold ${open ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                <div aria-labelledby={buttonId} className={open ? 'block' : 'hidden'} id={panelId} role="region">
                  <LandingCopy as="p" className="border-t border-brand-base/10 px-5 py-5 text-sm leading-7 text-brand-surface/80 sm:px-6">{answer}</LandingCopy>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
