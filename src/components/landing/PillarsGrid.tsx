import { siteConfig } from '@/config/site';

export function PillarsGrid() {
  return (
    <section className="border-b border-emerald-950/10 bg-[#F8FAF8] py-16 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">
            The Oqool learning standard
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
            Four pillars. One connected path to mastery.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {siteConfig.values.map((value) => (
            <article
              className="rounded-2xl border border-emerald-950/10 bg-white p-6"
              key={value.title}
            >
              <span aria-hidden="true" className="text-3xl">{value.icon}</span>
              <h3 className="mt-6 text-lg font-extrabold text-[#1A2E22]">
                {value.title}
              </h3>
              <p className="mt-1 font-arabic text-sm font-bold text-[#8C6B1B]" dir="rtl" lang="ar">
                {value.titleArabic}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                <span data-language-copy="en">{value.description}</span>
                <span data-language-copy="ar">{value.descriptionArabic}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
