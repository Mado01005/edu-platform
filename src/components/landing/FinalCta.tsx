import Link from 'next/link';
import { ArrowRight, CheckCircle2, LogIn } from 'lucide-react';

export function FinalCta() {
  return (
    <section className="px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center overflow-hidden rounded-[2rem] border border-[#D4AF37]/20 bg-[#084B2B] px-5 py-16 text-center shadow-[0_24px_70px_rgba(8,75,43,0.18)] sm:px-10">
        <CheckCircle2 aria-hidden="true" className="size-10 text-[#D4AF37]" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#F3D878]">
          11 / Your next chapter starts here
        </p>
        <h2 className="mt-3 text-3xl font-black sm:text-5xl">
          Build understanding that lasts beyond exam day.
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-100/80 sm:text-base">
          Explore the published curriculum, preview Lesson 1, and choose a full
          term or standalone chapter after signing in.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D4AF37] bg-[#FBF6E2] px-7 text-sm font-black text-[#084B2B] outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg focus-visible:ring-4 focus-visible:ring-[#D4AF37]/40"
            href="/catalog"
          >
            <span data-language-copy="en">Join Now — Explore Curriculum</span>
            <span data-language-copy="ar">انضم الآن — استكشف المناهج</span>
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-sm font-black text-white outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/20"
            href="/lms/login"
          >
            <LogIn aria-hidden="true" className="size-4" />
            <span data-language-copy="en">Student Sign In</span>
            <span data-language-copy="ar">دخول الطالب</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
