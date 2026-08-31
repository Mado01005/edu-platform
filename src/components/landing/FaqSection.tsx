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
    <section className="scroll-mt-28 py-20 md:py-28" id="faq">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <div className="max-w-lg">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FBF6E2] text-[#8A6A16]"><HelpCircle aria-hidden="true" className="size-5" /></span>
          <LandingCopy className="mt-6 block text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.faq.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.faq.title}</LandingCopy>
        </div>

        <div className="space-y-3">
          {landingContent.faq.items.map(([question, answer], index) => {
            const open = openIndex === index;
            const buttonId = `${idPrefix}-button-${index}`;
            const panelId = `${idPrefix}-panel-${index}`;
            return (
              <article className={`landing-card overflow-hidden rounded-3xl border bg-white/80 shadow-xl shadow-emerald-950/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/10 ${open ? 'border-[#D4AF37]/55' : 'border-emerald-500/15'}`} key={question.en}>
                <h3>
                  <button aria-controls={panelId} aria-expanded={open} className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-start font-black text-[#042D1A] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-100 sm:px-6" id={buttonId} onClick={() => { const next = open ? null : index; setOpenIndex(next); if (next !== null) trackLandingEvent('faq_open', { question: question.en }); }} type="button">
                    <span className="flex min-w-0 items-center gap-3"><span className="text-[10px] font-black text-[#A67C00]">0{index + 1}</span><LandingCopy>{question}</LandingCopy></span>
                    <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-[#084B2B] ${open ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                <div aria-labelledby={buttonId} className={open ? 'block' : 'hidden'} id={panelId} role="region">
                  <LandingCopy as="p" className="border-t border-emerald-950/8 px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6">{answer}</LandingCopy>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
