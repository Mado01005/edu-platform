import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function FinalCta() {
  return (
    <section className="border-y border-[#D4AF37]/30 bg-[#084B2B] py-16 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6">
        <CheckCircle2 aria-hidden="true" className="size-10 text-[#D4AF37]" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#F3D878]">
          Your next chapter starts here
        </p>
        <h2 className="mt-3 text-3xl font-black sm:text-5xl">
          Build understanding that lasts beyond exam day.
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-100/80 sm:text-base">
          Explore the published curriculum, preview Lesson 1, and choose a full
          term or standalone chapter after signing in.
        </p>
        <Link
          className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D4AF37] bg-[#FBF6E2] px-7 text-sm font-black text-[#084B2B] outline-none hover:bg-white focus-visible:ring-4 focus-visible:ring-[#D4AF37]/40"
          href="/catalog"
        >
          <span data-language-copy="en">Join Now — Explore Curriculum</span>
          <span data-language-copy="ar">انضم الآن — استكشف المناهج</span>
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}
