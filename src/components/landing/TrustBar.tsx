import { ClipboardCheck, Eye, Flag, MapPinned, Route, UserRoundCheck } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

const icons = [ClipboardCheck, UserRoundCheck, Route, Eye, Flag, MapPinned] as const;

export function TrustBar() {
  return (
    <section aria-labelledby="trust-heading" className="px-4 py-20 sm:px-6 md:py-28 lg:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-3xl border border-emerald-500/15 bg-emerald-950/50 p-5 text-white shadow-2xl shadow-black/30 backdrop-blur-md sm:p-7">
        <LandingCopy as="h2" className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.trust.label}</LandingCopy>
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-3 lg:grid-cols-6">
          {landingContent.trust.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <div className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 bg-emerald-950/50 px-3 py-4 text-center backdrop-blur-md" key={item.en}>
                <Icon aria-hidden="true" className="size-5 text-[#E7CD78]" />
                <LandingCopy className="text-[11px] font-extrabold leading-5 text-emerald-50">{item}</LandingCopy>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
