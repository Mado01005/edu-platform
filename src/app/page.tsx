import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Atom,
  Calculator,
  Dna,
  FlaskConical,
  Languages,
  Mail,
} from 'lucide-react';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';
import { CertificateShowcase } from '@/components/landing/certificate-showcase';
import { CurriculumRoadmap } from '@/components/landing/curriculum-roadmap';
import { StatsRibbon } from '@/components/landing/stats-ribbon';

export const metadata: Metadata = {
  title: 'Oqool Academy | Structured Academic Excellence',
  description:
    'Bilingual academic learning with live masterclasses, guided practice, mock exams, and verified completion certificates.',
};

const SUBJECTS = [
  { name: 'Mathematics', nameAr: 'الرياضيات', grades: 'Grades 7–12', icon: Calculator },
  { name: 'Physics', nameAr: 'الفيزياء', grades: 'Grades 9–12', icon: Atom },
  { name: 'Chemistry', nameAr: 'الكيمياء', grades: 'Grades 9–12', icon: FlaskConical },
  { name: 'Biology', nameAr: 'الأحياء', grades: 'Grades 9–12', icon: Dna },
  { name: 'Languages', nameAr: 'اللغات', grades: 'Grades 7–12', icon: Languages },
] as const;

export default function RootPage() {
  return (
    <main className="w-full min-w-0 overflow-x-hidden bg-[#F8FAF7] text-[#042917]">
      <header className="border-b border-emerald-950/10 bg-white/95">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            aria-label="Oqool Academy home"
            className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            href="/"
          >
            <OqoolEmblem className="size-11" />
            <OqoolWordmark className="hidden sm:block" />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-8 lg:flex">
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#subjects">المناهج</a>
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#about">عن الأكاديمية</a>
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#roadmap">المسار التعليمي</a>
          </nav>

          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#084B2B] px-4 text-sm font-extrabold text-white shadow-sm outline-none hover:bg-[#063B22] focus-visible:ring-4 focus-visible:ring-emerald-200 sm:px-5"
            href="/lms/login"
          >
            تسجيل الدخول
          </Link>
        </div>
      </header>

      <section className="border-b border-emerald-950/10 bg-white" id="about">
        <div className="mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-[#042917] sm:text-5xl lg:text-6xl">
              <span className="block font-sans text-[0.82em] font-black leading-[1.12] tracking-tight" dir="rtl" lang="ar">
                تعليم أكاديمي يبني فهماً يدوم.
              </span>
              <span className="mt-4 block">Academic learning built for lasting mastery.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
              Structured live teaching, guided practice, direct feedback, and
              exam-ready revision—brought together in one protected learning journey.
            </p>
            <p className="mt-3 max-w-xl text-base font-semibold leading-8 text-[#084B2B]" dir="rtl" lang="ar">
              شرح مباشر، تدريب متدرج، متابعة دقيقة، واستعداد حقيقي للامتحانات في مسار واحد متكامل.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-6 text-sm font-extrabold text-white shadow-sm outline-none hover:bg-[#063B22] focus-visible:ring-4 focus-visible:ring-emerald-200"
                href="/catalog"
              >
                استكشف المناهج
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-6 text-sm font-extrabold text-[#084B2B] shadow-sm outline-none hover:border-[#084B2B] hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-emerald-200"
                href="#roadmap"
              >
                شاهد المسار التعليمي
              </a>
            </div>
          </div>

          <div className="relative min-h-[24rem] overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#F8FAF7] shadow-[0_28px_80px_rgba(4,41,23,0.13)] sm:min-h-[32rem] lg:min-h-[39rem]">
            <Image
              alt="Two Oqool Academy secondary students studying mathematics together"
              className="object-cover object-center"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              src="/images/landing/oqool-academic-hero.webp"
            />
            <span aria-hidden="true" className="absolute bottom-0 left-0 h-1.5 w-32 bg-[#D4AF37]" />
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAF7] py-20 md:py-28" id="subjects">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-4xl font-semibold tracking-tight text-[#042917] md:text-5xl">
                Academic subjects for every decisive school year.
              </h2>
              <p className="mt-3 text-lg font-extrabold text-[#084B2B]" dir="rtl" lang="ar">
                مناهج المدرسة والمرحلة الثانوية
              </p>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-extrabold text-[#084B2B] hover:text-[#063B22]" href="/catalog">
              View the full catalog
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SUBJECTS.map((subject) => {
              const Icon = subject.icon;

              return (
                <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D4AF37]/70 hover:shadow-lg" key={subject.name}>
                  <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-[#084B2B]">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
                  </span>
                  <p className="mt-6 text-lg font-extrabold text-[#042917]" dir="rtl" lang="ar">{subject.nameAr}</p>
                  <h3 className="mt-1 font-serif text-2xl font-semibold text-[#042917]">{subject.name}</h3>
                  <span className="mt-5 inline-flex rounded-full border border-[#D4AF37]/40 bg-[#FDF8E8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#8C6B1B]">
                    {subject.grades}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAF7] pb-20 md:pb-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <StatsRibbon />
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <CurriculumRoadmap />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-emerald-950/10 bg-[#F8FAF7] py-20 md:py-28">
        <span aria-hidden="true" className="absolute left-1/2 top-0 h-20 w-px bg-gradient-to-b from-[#D4AF37] to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <CertificateShowcase />
        </div>
      </section>

      <footer className="bg-[#042917] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <OqoolEmblem className="size-12" />
              <OqoolWordmark className="[&_span]:text-white" />
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-100/75">
              A structured academic home for clear explanations, consistent
              practice, confident exams, and achievements students can carry forward.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">Academy</h2>
            <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-emerald-100/80">
              <a href="#subjects" className="hover:text-white">المناهج</a>
              <a href="#roadmap" className="hover:text-white">المسار التعليمي</a>
              <a href="#certificate" className="hover:text-white">الشهادة المعتمدة</a>
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">Continue</h2>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm text-emerald-100/80">
              <Link href="/catalog" className="hover:text-white">Explore courses</Link>
              <Link href="/support" className="hover:text-white">Student support</Link>
              <Link href="/lms/login" className="hover:text-white">Sign in</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#D4AF37]/20">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-emerald-100/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Oqool Academy. All rights reserved.</p>
            <a className="inline-flex items-center gap-2 hover:text-white" href="mailto:support@edu-platform.me">
              <Mail aria-hidden="true" className="size-3.5" />
              support@edu-platform.me
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
