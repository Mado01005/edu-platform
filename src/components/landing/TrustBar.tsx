import { ClipboardCheck, PlayCircle, RefreshCw, UserRoundCheck, Video } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const icons = [Video, UserRoundCheck, ClipboardCheck, PlayCircle, RefreshCw] as const;

export function TrustBar() {
  return (
    <section aria-labelledby="trust-heading" className="bg-brand-mint-light px-4 py-20 text-brand-base sm:px-6 md:py-28 lg:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-3xl border border-brand-mint-border bg-white p-5 text-brand-base shadow-xl shadow-brand-base/10 sm:p-7">
        <LandingCopy as="h2" className="text-center text-xs font-black uppercase tracking-[0.18em] text-brand-surface">{landingContent.trust.label}</LandingCopy>
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-brand-mint-border md:grid-cols-3 lg:grid-cols-5">
          {landingContent.trust.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <div className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 bg-brand-ivory-alt px-3 py-4 text-center" key={item.en}>
                <Icon aria-hidden="true" className="size-5 text-brand-gold-bronze" />
                <LandingCopy className="text-[11px] font-extrabold leading-5 text-brand-base">{item}</LandingCopy>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
