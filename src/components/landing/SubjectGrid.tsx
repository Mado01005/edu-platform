'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Atom,
  BookOpen,
  Dna,
  FlaskConical,
  GraduationCap,
  Orbit,
  PlayCircle,
  Sigma,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export type LandingCourse = {
  chapterCount: number;
  grade: '1st Sec' | '2nd Sec' | '3rd Sec';
  id: string;
  instructorAvatar: string | null;
  instructorName: string;
  previewLessonId: string | null;
  subject: 'Physics' | 'Pure Mathematics' | 'Mechanics' | 'Chemistry' | 'Biology';
  title: string;
};

const grades = ['1st Sec', '2nd Sec', '3rd Sec'] as const;
const subjects = [
  'Physics',
  'Pure Mathematics',
  'Mechanics',
  'Chemistry',
  'Biology',
] as const;

type FilterMode = 'grade' | 'subject';

const subjectDetails: Record<LandingCourse['subject'], { icon: LucideIcon; tone: string }> = {
  Biology: { icon: Dna, tone: 'bg-rose-50 text-rose-700' },
  Chemistry: { icon: FlaskConical, tone: 'bg-amber-50 text-amber-700' },
  Mechanics: { icon: Orbit, tone: 'bg-sky-50 text-sky-700' },
  Physics: { icon: Atom, tone: 'bg-emerald-50 text-[#084B2B]' },
  'Pure Mathematics': { icon: Sigma, tone: 'bg-violet-50 text-violet-700' },
};

export function SubjectGrid({ courses }: { courses: LandingCourse[] }) {
  const [mode, setMode] = useState<FilterMode>('grade');
  const [grade, setGrade] = useState<(typeof grades)[number]>('1st Sec');
  const [subject, setSubject] = useState<(typeof subjects)[number]>('Physics');
  const filtered = useMemo(
    () => courses.filter((course) => (mode === 'grade' ? course.grade === grade : course.subject === subject)),
    [courses, grade, mode, subject],
  );

  return (
    <section className="py-20 md:py-28" id="curriculum">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">
              <span data-language-copy="en">Curriculum explorer</span>
              <span data-language-copy="ar">مستكشف المناهج</span>
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
              <span data-language-copy="en">Find the right path for this school year.</span>
              <span data-language-copy="ar">اختر المسار الأنسب لهذا العام الدراسي.</span>
            </h2>
          </div>

          <div aria-label="Curriculum filter type" className="inline-flex w-fit rounded-full bg-slate-100 p-1" role="tablist">
            {(['grade', 'subject'] as const).map((value) => (
              <button
                aria-selected={mode === value}
                className={`min-h-10 rounded-full px-4 text-xs font-extrabold transition-all ${mode === value ? 'bg-white text-[#084B2B] shadow-sm' : 'text-slate-500 hover:text-[#084B2B]'}`}
                key={value}
                onClick={() => setMode(value)}
                role="tab"
                type="button"
              >
                {value === 'grade' ? <><span data-language-copy="en">Grade level</span><span data-language-copy="ar">الصف الدراسي</span></> : <><span data-language-copy="en">Subject</span><span data-language-copy="ar">المادة</span></>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 max-w-full overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max rounded-full bg-slate-100 p-1" role="group">
            {(mode === 'grade' ? grades : subjects).map((value) => {
              const selected = mode === 'grade' ? value === grade : value === subject;
              return (
                <button
                  aria-pressed={selected}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-extrabold transition-all ${selected ? 'bg-[#084B2B] text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#084B2B]'}`}
                  key={value}
                  onClick={() => {
                    if (mode === 'grade') setGrade(value as (typeof grades)[number]);
                    else setSubject(value as (typeof subjects)[number]);
                  }}
                  type="button"
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const details = subjectDetails[course.subject];
            const SubjectIcon = details.icon;

            return (
              <article className="landing-card group flex min-w-0 flex-col rounded-3xl border border-emerald-950/5 bg-white p-5 hover:-translate-y-1 hover:shadow-lg" key={course.id}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${details.tone}`}><SubjectIcon aria-hidden="true" className="size-5" /></span>
                  <span className="inline-flex rounded-full bg-[#F7F8F4] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">{course.grade}</span>
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#0F6E41]">{course.subject}</p>
                <h3 className="mt-2 break-words text-xl font-black text-[#1A2E22]">{course.title}</h3>
                <div className="mt-6 flex min-w-0 items-center gap-3">
                  {course.instructorAvatar ? (
                    <Image alt={course.instructorName} className="size-10 rounded-full object-cover" height={40} src={course.instructorAvatar} width={40} />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#084B2B]"><GraduationCap aria-hidden="true" className="size-5" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-slate-800">{course.instructorName}</span>
                    <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">Verified teacher</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500"><BookOpen aria-hidden="true" className="size-3.5" /> {course.chapterCount}</span>
                </div>
                <Link
                  className="mt-6 inline-flex min-h-11 translate-y-0 items-center justify-center gap-2 rounded-full bg-[#084B2B] px-4 text-sm font-extrabold text-white opacity-100 transition-all duration-300 hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100"
                  href={course.previewLessonId ? `/preview/${course.previewLessonId}` : '/preview'}
                >
                  <PlayCircle aria-hidden="true" className="size-4" />
                  <span data-language-copy="en">Preview Lesson 1</span>
                  <span data-language-copy="ar">شاهد الدرس الأول</span>
                </Link>
              </article>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="mt-6 rounded-3xl border border-dashed border-emerald-950/10 bg-white/75 p-8 text-center text-sm text-slate-600">
            <span data-language-copy="en">This curriculum path is being prepared. Explore all published courses in the catalog.</span>
            <span data-language-copy="ar">يجري تجهيز هذا المسار. يمكنك استعراض كل الدورات المنشورة في دليل المناهج.</span>
            <Link className="mx-1 font-extrabold text-[#084B2B] underline underline-offset-4" href="/catalog">Catalog</Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
