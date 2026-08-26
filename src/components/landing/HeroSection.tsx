import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, PlayCircle, ShieldCheck } from 'lucide-react';
import { LiveClassTicker } from '@/components/landing/live-class-ticker';
import { StudentDashboardPreview } from '@/components/landing/student-dashboard-preview';
import { siteConfig } from '@/config/site';

export function HeroSection({
  nextClass,
}: {
  nextClass: { startTime: string; title: string } | null;
}) {
  return (
    <section
      className="relative border-b border-emerald-950/10 bg-white"
      id="live-schedule"
    >
      <div aria-hidden="true" className="oqool-orbit absolute inset-0 opacity-50" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-7.75rem)] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-20">
        <div className="min-w-0 max-w-2xl">
          <LiveClassTicker
            startTime={nextClass?.startTime ?? null}
            title={nextClass?.title ?? null}
          />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#0F6E41]">
            Egypt · KSA · Secondary STEM mastery
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.045em] text-[#042D1A] sm:text-6xl lg:text-7xl">
            <span data-language-copy="en">
              Grow Minds.<br />Shape the Future.
            </span>
            <span className="font-arabic" data-language-copy="ar">
              نُنَمِّي العقول...<br />ونصنع المستقبل
            </span>
          </h1>
          <p className="mt-5 font-arabic text-xl font-black leading-9 text-[#A68020] sm:text-2xl" dir="rtl" lang="ar">
            {siteConfig.sloganArabic}
          </p>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-6 text-sm font-extrabold text-white outline-none hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200"
              href="/catalog"
            >
              <span data-language-copy="en">Explore Curriculum</span>
              <span data-language-copy="ar">استكشف المناهج</span>
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-950/15 bg-white px-6 text-sm font-extrabold text-[#084B2B] outline-none hover:border-[#D4AF37] hover:bg-[#FBF6E2] focus-visible:ring-4 focus-visible:ring-emerald-100"
              href="/preview"
            >
              <PlayCircle aria-hidden="true" className="size-4" />
              <span data-language-copy="en">Watch Free Lesson 1</span>
              <span data-language-copy="ar">شاهد الدرس الأول مجانًا</span>
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-emerald-950/10 bg-[#042D1A] text-white">
            <Image
              alt="Official Oqool Academy banner with the four learning pillars"
              className="h-auto w-full border-b border-[#D4AF37]/30 object-cover"
              height={809}
              priority
              sizes="(max-width: 1023px) 100vw, (max-width: 1535px) 55vw, 28vw"
              src="/brand/oqool-banner.png"
              width={1942}
            />
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F3D878]">
                  Official academy identity
                </p>
                <h2 className="mt-3 text-xl font-black">A clear path from lesson one to exam day.</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-100/75">
                  Every chapter connects the lecture, practice, assessment, and
                  family progress signal in one protected workspace.
                </p>
              </div>
              <p className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-bold text-emerald-100/80">
                <ShieldCheck aria-hidden="true" className="size-4 text-[#D4AF37]" />
                Built for focused, accountable learning
              </p>
            </div>
          </article>
          <StudentDashboardPreview />
        </div>
      </div>
    </section>
  );
}
