import Image from 'next/image';
import { BadgeCheck, MessageSquareQuote } from 'lucide-react';

export type LandingFaculty = {
  avatarUrl: string | null;
  credential: string;
  id: string;
  name: string;
  subjects: string[];
};

export function FacultyGrid({ faculty }: { faculty: LandingFaculty[] }) {
  return (
    <section className="py-20 md:py-28" id="faculty">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">
            <span data-language-copy="en">Expert faculty</span>
            <span data-language-copy="ar">هيئة التدريس</span>
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
            <span data-language-copy="en">Specialists who teach for understanding.</span>
            <span data-language-copy="ar">خبراء يعلّمون من أجل الفهم الحقيقي.</span>
          </h2>
        </div>

        <div className="mt-10 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {faculty.map((teacher) => (
            <article className="landing-card min-w-0 rounded-3xl border border-emerald-950/5 bg-white p-5 hover:-translate-y-1 hover:shadow-lg" key={teacher.id}>
              <div className="flex min-w-0 items-center gap-4">
                {teacher.avatarUrl ? (
                  <Image alt={teacher.name} className="size-14 rounded-2xl object-cover" height={56} src={teacher.avatarUrl} width={56} />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#084B2B] text-lg font-black text-white">{teacher.name.slice(0, 1).toUpperCase()}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5 font-extrabold text-[#1A2E22]">
                    <span className="truncate">{teacher.name}</span>
                    <BadgeCheck aria-label="Verified Oqool faculty" className="size-4 shrink-0 text-[#0F6E41]" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{teacher.credential}</span>
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => <span className="rounded-full border border-[#D4AF37]/40 bg-[#FBF6E2] px-2.5 py-1 text-[10px] font-black text-[#806219]" key={subject}>{subject}</span>)}
              </div>
              <p className="mt-5 flex items-start gap-2 border-t border-emerald-950/10 pt-4 text-xs leading-5 text-slate-600">
                <MessageSquareQuote aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#0F6E41]" />
                <span data-language-copy="en">Verified student feedback is collected after completed enrollments.</span>
                <span data-language-copy="ar">يتم توثيق تقييمات الطلاب بعد إتمام الدراسة.</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
