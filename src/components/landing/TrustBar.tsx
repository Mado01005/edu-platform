import Image from 'next/image';
import { BadgeCheck, BookOpenCheck, GraduationCap, Radio } from 'lucide-react';
import { siteConfig } from '@/config/site';

export type LandingFaculty = {
  avatarUrl: string | null;
  credential: string;
  id: string;
  name: string;
  subjects: string[];
};

const metrics = [
  { icon: GraduationCap, label: 'Students reached', value: '12,000+' },
  { icon: BookOpenCheck, label: 'Structured mastery paths', value: '5 STEM' },
  { icon: Radio, label: 'Progress visibility', value: 'Live' },
] as const;

export function TrustBar({ faculty }: { faculty: LandingFaculty[] }) {
  return (
    <section className="scroll-mt-28 px-4 py-5 sm:px-6 lg:px-8" aria-label="Oqool trust and social proof" id="faculty">
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-3xl border border-emerald-950/5 bg-[#084B2B] text-white shadow-sm shadow-emerald-950/10">
        <div className="grid divide-y divide-white/10 lg:grid-cols-[1.15fr_0.85fr] lg:divide-x lg:divide-y-0">
          <div className="grid min-w-0 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div className="flex min-h-28 items-center gap-4 px-5 py-5" key={metric.label}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#F3D878]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <strong className="block text-xl font-black tabular-nums sm:text-2xl">{metric.value}</strong>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100/60">{metric.label}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-5 sm:px-7">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-[#F3D878]">
                <BadgeCheck aria-hidden="true" className="size-4" /> Verified faculty
              </p>
              <p className="mt-2 truncate text-sm font-extrabold">
                {faculty[0]?.name ?? 'Oqool Academic Faculty'}
              </p>
              <p className="mt-1 truncate text-[11px] text-emerald-100/60">
                {faculty[0]?.subjects.join(' · ') || 'Mathematics · Sciences'}
              </p>
            </div>
            <div className="flex shrink-0 -space-x-2 rtl:space-x-reverse">
              {faculty.slice(0, 3).map((teacher) => (
                teacher.avatarUrl ? (
                  <Image
                    alt={teacher.name}
                    className="size-11 rounded-full border-2 border-[#084B2B] object-cover"
                    height={44}
                    key={teacher.id}
                    src={teacher.avatarUrl}
                    width={44}
                  />
                ) : (
                  <span
                    aria-label={teacher.name}
                    className="flex size-11 items-center justify-center rounded-full border-2 border-[#084B2B] bg-[#FBF6E2] text-xs font-black text-[#084B2B]"
                    key={teacher.id}
                    role="img"
                  >
                    {teacher.name.slice(0, 1).toUpperCase()}
                  </span>
                )
              ))}
            </div>
          </div>
        </div>

        <div className="grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {siteConfig.motto.map((item) => (
            <div className="flex min-h-14 items-center justify-center gap-2 px-3 text-center text-xs font-extrabold" key={item.label}>
              <span aria-hidden="true" className="text-[#D4AF37]">{item.icon}</span>
              <span data-language-copy="en">{item.label}</span>
              <span data-language-copy="ar">{item.labelArabic}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
