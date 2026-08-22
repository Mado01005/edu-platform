import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, CalendarDays, Mail, ShieldCheck } from 'lucide-react';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';

export interface LegalSection {
  content: ReactNode;
  id: string;
  title: string;
  titleAr: string;
}

interface LegalPageShellProps {
  effectiveDate: string;
  eyebrow: string;
  intro: ReactNode;
  sections: readonly LegalSection[];
  title: string;
  titleAr: string;
}

export function LegalPageShell({
  effectiveDate,
  eyebrow,
  intro,
  sections,
  title,
  titleAr,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAF7] text-[#042917]">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Oqool Academy course catalog"
            className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            href="/catalog"
          >
            <OqoolEmblem className="size-11" />
            <OqoolWordmark className="hidden sm:block" />
          </Link>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-950/15 bg-white px-4 text-sm font-extrabold text-[#084B2B] shadow-sm outline-none hover:border-[#084B2B] hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-200"
            href="/catalog"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to academy
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#D4AF37]/25 bg-[#042917] text-white">
        <span aria-hidden="true" className="absolute inset-y-0 left-[8%] w-px bg-[#D4AF37]/45" />
        <span aria-hidden="true" className="absolute -right-24 top-1/2 size-72 -translate-y-1/2 rounded-full border border-[#D4AF37]/15" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1fr_0.55fr] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">{eyebrow}</p>
            <h1 className="mt-5 font-serif text-5xl font-semibold tracking-[-0.035em] sm:text-6xl">{title}</h1>
            <p className="mt-4 text-2xl font-black text-emerald-100" dir="rtl" lang="ar">{titleAr}</p>
            <div className="mt-7 max-w-2xl text-sm leading-7 text-emerald-50/80 sm:text-base">{intro}</div>
          </div>
          <div className="flex items-end lg:justify-end">
            <div className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/25 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-[#D4AF37]">
                <ShieldCheck aria-hidden="true" className="size-6" />
                <p className="text-sm font-extrabold">Oqool trust record</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100/70">
                <CalendarDays aria-hidden="true" className="size-4" />
                Effective {effectiveDate}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex items-center gap-2 text-[#084B2B]">
              <BookOpenCheck aria-hidden="true" className="size-5" />
              <h2 className="text-sm font-extrabold">On this page</h2>
            </div>
            <nav aria-label={`${title} sections`} className="mt-4 flex flex-col gap-1.5">
              {sections.map((section, index) => (
                <a
                  className="rounded-lg px-3 py-2 text-sm leading-5 text-slate-600 outline-none hover:bg-emerald-50 hover:text-[#084B2B] focus-visible:ring-2 focus-visible:ring-emerald-300"
                  href={`#${section.id}`}
                  key={section.id}
                >
                  <span className="mr-2 font-mono text-[10px] font-bold text-[#8C6B1B]">{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0 overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
          <div className="border-b border-emerald-950/10 bg-[#FDF8E8] px-6 py-5 sm:px-9">
            <p className="max-w-3xl text-sm leading-7 text-[#6D5618]">
              This document is written for students and families. Short headings help you find the rule or right that matters without reading every section first.
            </p>
          </div>
          <div className="divide-y divide-emerald-950/10 px-6 sm:px-9">
            {sections.map((section, index) => (
              <section className="scroll-mt-8 py-9 sm:py-11" id={section.id} key={section.id}>
                <div className="grid min-w-0 gap-5 md:grid-cols-[4rem_minmax(0,1fr)]">
                  <span className="font-mono text-sm font-bold tracking-[0.16em] text-[#D4AF37]">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#042917]">{section.title}</h2>
                    <p className="mt-1 text-base font-extrabold text-[#084B2B]" dir="rtl" lang="ar">{section.titleAr}</p>
                    <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 [&_a]:font-bold [&_a]:text-[#084B2B] [&_a]:underline [&_a]:decoration-emerald-200 [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-extrabold [&_strong]:text-slate-800 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">
                      {section.content}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>

      <footer className="border-t border-[#D4AF37]/25 bg-[#042917] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <OqoolEmblem className="size-10" />
              <OqoolWordmark className="[&_span]:text-white" />
            </div>
            <p className="mt-3 text-xs text-emerald-100/65">Clear learning deserves clear commitments.</p>
          </div>
          <nav aria-label="Legal and contact links" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-emerald-100/75">
            <Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/terms">Terms</Link>
            <a className="inline-flex items-center gap-2 hover:text-white" href="mailto:support@edu-platform.me">
              <Mail aria-hidden="true" className="size-4" />
              support@edu-platform.me
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
