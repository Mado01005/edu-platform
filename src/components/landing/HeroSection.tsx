import Link from 'next/link';
import { ArrowRight, PlayCircle, Star } from 'lucide-react';
import { LiveClassTicker } from '@/components/landing/live-class-ticker';
import { StudentDashboardPreview } from '@/components/landing/student-dashboard-preview';
import { siteConfig } from '@/config/site';

const studentFaces = [
  { initials: 'MA', color: 'bg-[#E7C96A]' },
  { initials: 'YS', color: 'bg-[#B9DDC6]' },
  { initials: 'LN', color: 'bg-[#F0C7AE]' },
  { initials: 'OK', color: 'bg-[#084B2B] text-white' },
] as const;

export function HeroSection({
  nextClass,
}: {
  nextClass: { startTime: string; title: string } | null;
}) {
  return (
    <section
      className="relative isolate overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-14"
      id="live-schedule"
    >
      <div aria-hidden="true" className="absolute -left-32 top-16 -z-10 size-80 rounded-full bg-emerald-200/35 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-32 bottom-8 -z-10 size-96 rounded-full bg-amber-100/60 blur-3xl" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:px-8">
        <div className="min-w-0 max-w-2xl lg:py-14">
          <LiveClassTicker
            startTime={nextClass?.startTime ?? null}
            title={nextClass?.title ?? null}
          />
          <p className="mt-8 text-[11px] font-black uppercase tracking-[0.24em] text-[#0F6E41]">
            Egypt · KSA · Secondary STEM mastery
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[0.96] tracking-tight text-[#084B2B] sm:text-6xl lg:text-[4.35rem]">
            <span data-language-copy="en">
              Grow Minds.<br /><span className="text-[#1A2E22]">Shape the Future.</span>
            </span>
            <span className="font-arabic" data-language-copy="ar">
              نُنَمِّي العقول...<br /><span className="text-[#1A2E22]">ونصنع المستقبل</span>
            </span>
          </h1>
          <p className="mt-5 font-arabic text-lg font-black leading-9 text-[#A68020] sm:text-xl" dir="rtl" lang="ar">
            {siteConfig.sloganArabic}
          </p>
          <p className="mt-6 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
            <span data-language-copy="en">
              Master Egypt and KSA secondary STEM curricula through guided
              chapters, expert live teaching, protected HD lessons, and clear
              progress reports for every family.
            </span>
            <span data-language-copy="ar">
              أتقن مناهج المرحلة الثانوية في مصر والسعودية عبر فصول موجهة،
              وتعليم مباشر مع خبراء، ودروس عالية الدقة، وتقارير واضحة للأسرة.
            </span>
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#084B2B] px-6 text-sm font-extrabold text-white outline-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0F6E41] hover:shadow-[0_12px_32px_rgba(212,175,55,0.28)] focus-visible:ring-4 focus-visible:ring-emerald-200"
              href="/catalog"
            >
              <span data-language-copy="en">Explore Curriculum</span>
              <span data-language-copy="ar">استكشف المناهج</span>
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-950/10 bg-white px-6 text-sm font-extrabold text-[#084B2B] shadow-sm outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4AF37]/70 hover:shadow-md focus-visible:ring-4 focus-visible:ring-emerald-100"
              href="/preview"
            >
              <PlayCircle aria-hidden="true" className="size-4" />
              <span data-language-copy="en">Watch Free Lesson 1</span>
              <span data-language-copy="ar">شاهد الدرس الأول مجانًا</span>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div aria-label="Oqool student community" className="flex -space-x-2.5 rtl:space-x-reverse">
              {studentFaces.map((student) => (
                <span
                  aria-label={`Student ${student.initials}`}
                  className={`flex size-10 items-center justify-center rounded-full border-2 border-[#FAFAF7] text-[10px] font-black text-[#1A2E22] shadow-sm ${student.color}`}
                  key={student.initials}
                  role="img"
                >
                  {student.initials}
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[#C79A16]">
                {Array.from({ length: 5 }, (_, index) => <Star aria-hidden="true" className="size-3.5 fill-current" key={index} />)}
                <span className="ml-1 text-xs font-black tabular-nums text-[#1A2E22]">4.9</span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-slate-500">Trusted by ambitious students and families</p>
            </div>
          </div>
        </div>

        <StudentDashboardPreview />
      </div>
    </section>
  );
}
