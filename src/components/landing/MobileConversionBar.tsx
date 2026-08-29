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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-950/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <WhatsAppLink before={<MessageCircle aria-hidden="true" className="size-4" />} className="mx-auto flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-full bg-[#084B2B] px-5 text-sm font-black text-white outline-none focus-visible:ring-4 focus-visible:ring-emerald-200" eventName="navbar_diagnostic_click" intent="diagnostic" label="mobile_sticky_bar">
        {{ en: 'Book Free Assessment', ar: 'احجز تقييمًا مجانيًا' }}
      </WhatsAppLink>
    </div>
  );
}
