'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Eye, GraduationCap, PlayCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

export type LandingCourse = {
  chapterCount: number;
  grade: '1st Sec' | '2nd Sec' | '3rd Sec';
  id: string;
  instructorAvatar: string | null;
  instructorName: string;
  previewLessonId: string | null;
  subject: 'Physics' | 'Pure Mathematics' | 'Mechanics' | 'Chemistry' | 'Biology' | 'Languages';
  title: string;
};

const grades = ['1st Sec', '2nd Sec', '3rd Sec'] as const;
const subjects = [
  'Physics',
  'Pure Mathematics',
  'Mechanics',
  'Chemistry',
  'Biology',
  'Languages',
] as const;

type FilterMode = 'grade' | 'subject';

export function SubjectGrid({ courses }: { courses: LandingCourse[] }) {
  const [mode, setMode] = useState<FilterMode>('grade');
  const [grade, setGrade] = useState<(typeof grades)[number]>('1st Sec');
  const [subject, setSubject] = useState<(typeof subjects)[number]>('Physics');
  const filtered = useMemo(
    () => courses.filter((course) => (mode === 'grade' ? course.grade === grade : course.subject === subject)),
    [courses, grade, mode, subject],
  );

  return (
    <section className="bg-[#F8FAF8] py-20 md:py-28" id="curriculum">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
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

        <div className="mt-8 rounded-2xl border border-emerald-950/10 bg-white p-3">
          <div aria-label="Curriculum filter type" className="grid grid-cols-2 gap-2" role="tablist">
            {(['grade', 'subject'] as const).map((value) => (
              <button
                aria-selected={mode === value}
                className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${mode === value ? 'bg-[#084B2B] text-white' : 'bg-[#F8FAF8] text-slate-600 hover:bg-emerald-50 hover:text-[#084B2B]'}`}
                key={value}
                onClick={() => setMode(value)}
                role="tab"
                type="button"
              >
                {value === 'grade' ? (
                  <><span data-language-copy="en">By Grade Level</span><span data-language-copy="ar">حسب الصف الدراسي</span></>
                ) : (
                  <><span data-language-copy="en">By Subject</span><span data-language-copy="ar">حسب المادة</span></>
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1" role="group">
            {(mode === 'grade' ? grades : subjects).map((value) => {
              const selected = mode === 'grade' ? value === grade : value === subject;
              return (
                <button
                  aria-pressed={selected}
                  className={`min-h-10 shrink-0 rounded-xl border px-4 text-xs font-extrabold ${selected ? 'border-[#D4AF37] bg-[#FBF6E2] text-[#084B2B]' : 'border-emerald-950/10 bg-white text-slate-600 hover:border-emerald-300'}`}
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

        <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <article className="flex min-w-0 flex-col rounded-2xl border border-emerald-950/10 bg-white p-5" key={course.id}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="inline-flex rounded-full border border-[#D4AF37]/45 bg-[#FBF6E2] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#806219]">{course.grade}</span>
                <span className="truncate text-xs font-bold text-[#0F6E41]">{course.subject}</span>
              </div>
              <h3 className="mt-5 break-words text-xl font-extrabold text-[#1A2E22]">{course.title}</h3>
              <div className="mt-5 flex min-w-0 items-center gap-3">
                {course.instructorAvatar ? (
                  <Image alt="" className="size-10 rounded-full object-cover" height={40} src={course.instructorAvatar} width={40} />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#084B2B]"><GraduationCap aria-hidden="true" className="size-5" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{course.instructorName}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><BookOpen aria-hidden="true" className="size-3" /> {course.chapterCount} chapters</span>
                </span>
              </div>
              {course.previewLessonId ? (
                <Link className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-extrabold text-white hover:bg-[#0F6E41]" href={`/preview/${course.previewLessonId}`}>
                  <PlayCircle aria-hidden="true" className="size-4" />
                  <span data-language-copy="en">Preview Lesson 1</span>
                  <span data-language-copy="ar">شاهد الدرس الأول</span>
                </Link>
              ) : (
                <span className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-950/15 bg-[#F8FAF8] px-4 text-sm font-bold text-slate-500">
                  <Eye aria-hidden="true" className="size-4" />
                  <span data-language-copy="en">Free preview being prepared</span>
                  <span data-language-copy="ar">يتم تجهيز الدرس المجاني</span>
                </span>
              )}
            </article>
          ))}
        </div>

        {!filtered.length ? (
          <div className="mt-6 rounded-2xl border border-dashed border-emerald-950/15 bg-white p-8 text-center text-sm text-slate-600">
            <span data-language-copy="en">This curriculum path is being prepared. Explore all published courses in the catalog.</span>
            <span data-language-copy="ar">يجري تجهيز هذا المسار. يمكنك استعراض كل الدورات المنشورة في دليل المناهج.</span>
            <Link className="mx-1 font-extrabold text-[#084B2B] underline underline-offset-4" href="/catalog">Catalog</Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
