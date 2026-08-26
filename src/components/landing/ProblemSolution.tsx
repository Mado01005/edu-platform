import { ArrowRight, Check, X } from 'lucide-react';

const comparisons = [
  {
    problem: 'Scattered notes, links, and last-minute revision',
    solution: 'Milestone chapters connect every lesson, resource, and exam.',
  },
  {
    problem: 'No reliable view of what the student actually completed',
    solution: '85% lesson completion, attendance minutes, and scores are tracked.',
  },
  {
    problem: 'One pace for every learner with little chance to revisit',
    solution: 'Protected on-demand video, variable speed, and worked solutions.',
  },
  {
    problem: 'Parents hear about gaps only after the final result',
    solution: 'A read-only parent portal and WhatsApp progress signals close the loop.',
  },
] as const;

export function ProblemSolution() {
  return (
    <section className="border-y border-emerald-950/10 bg-[#042D1A] py-20 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F3D878]">
            From tutoring friction to learning clarity
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Structure changes what students can achieve.
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/15">
          <div className="hidden grid-cols-[1fr_auto_1fr] border-b border-white/15 bg-white/[0.06] text-xs font-black uppercase tracking-[0.16em] text-emerald-100/75 md:grid">
            <p className="p-5">Traditional tutoring friction</p>
            <span aria-hidden="true" className="w-px bg-white/15" />
            <p className="p-5">Oqool Academy advantage</p>
          </div>
          {comparisons.map((item) => (
            <article
              className="grid border-b border-white/10 last:border-b-0 md:grid-cols-[1fr_auto_1fr]"
              key={item.problem}
            >
              <div className="flex min-w-0 items-start gap-3 p-5 text-sm leading-6 text-emerald-100/70">
                <X aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-300" />
                <span>{item.problem}</span>
              </div>
              <div className="hidden w-px bg-white/15 md:block" />
              <div className="flex min-w-0 items-start gap-3 border-t border-white/10 bg-white/[0.035] p-5 text-sm font-bold leading-6 text-white md:border-t-0">
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#D4AF37]" />
                <span>{item.solution}</span>
                <ArrowRight aria-hidden="true" className="mt-0.5 hidden size-4 shrink-0 text-[#D4AF37] lg:block" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
