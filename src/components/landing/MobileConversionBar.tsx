'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';

export function MobileConversionBar() {
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (footerVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-rim bg-brand-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl shadow-black/30 backdrop-blur-xl md:hidden">
      <WhatsAppLink before={<MessageCircle aria-hidden="true" className="size-4" />} className="landing-cta mx-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-full bg-brand-gold px-5 text-sm font-black text-brand-base shadow-lg shadow-black/25 ring-1 ring-brand-gold-hover/40 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover hover:shadow-[0_0_28px_rgba(229,184,92,0.24)] focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35" eventName="navbar_diagnostic_click" intent="diagnostic" label="mobile_sticky_bar">
        {{ en: 'Book Free Assessment', ar: 'احجز تقييمًا مجانيًا' }}
      </WhatsAppLink>
    </div>
  );
}
