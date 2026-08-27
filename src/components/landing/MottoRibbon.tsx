import { siteConfig } from '@/config/site';

export function MottoRibbon() {
  return (
    <section aria-label={siteConfig.mottoRibbon} className="px-4 py-3 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 divide-y divide-white/10 overflow-hidden rounded-3xl bg-[#084B2B] shadow-sm shadow-emerald-950/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {siteConfig.motto.map((item) => (
          <div
            className="flex min-h-16 items-center justify-center gap-3 px-3 text-center text-sm font-extrabold sm:min-h-20"
            key={item.label}
          >
            <span aria-hidden="true" className="text-[#D4AF37]">{item.icon}</span>
            <span data-language-copy="en">{item.label}</span>
            <span data-language-copy="ar">{item.labelArabic}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
