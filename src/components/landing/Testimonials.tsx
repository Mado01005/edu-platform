import { BarChart3, CheckCircle2, MessageSquareText, ShieldCheck } from 'lucide-react';

const outcomes = [
  {
    description: 'Highest-score recording across configured retakes keeps improvement visible without hiding earlier effort.',
    icon: BarChart3,
    kicker: 'Exam outcome',
    metric: 'Best attempt',
    title: 'Progress, not one high-pressure moment',
  },
  {
    description: 'Attendance minutes, lesson completion, scores, and teacher feedback land in one read-only family view.',
    icon: ShieldCheck,
    kicker: 'Parent outcome',
    metric: 'One clear view',
    title: 'Fewer end-of-term surprises',
  },
  {
    description: 'Worked solutions and rubric feedback turn every result into a specific next action for the learner.',
    icon: MessageSquareText,
    kicker: 'Student outcome',
    metric: 'Next step shown',
    title: 'Feedback that moves learning forward',
  },
] as const;

export function Testimonials() {
  return (
    <section className="py-20 md:py-28" id="outcomes">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">09 / Outcomes</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
            Outcomes families can see—not vague promises.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Oqool turns learning activity into evidence: completed work, scored attempts, attendance, and actionable feedback.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            return (
              <article
                className={`landing-card group flex min-w-0 flex-col rounded-3xl border border-emerald-950/5 p-6 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${index === 1 ? 'bg-[#084B2B] text-white' : 'bg-white text-[#1A2E22]'}`}
                key={outcome.title}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`flex size-11 items-center justify-center rounded-2xl ${index === 1 ? 'bg-white/10 text-[#F3D878]' : 'bg-emerald-50 text-[#084B2B]'}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CheckCircle2 aria-hidden="true" className={`size-5 ${index === 1 ? 'text-[#D4AF37]' : 'text-[#0F6E41]'}`} />
                </div>
                <p className={`mt-8 text-[10px] font-black uppercase tracking-[0.18em] ${index === 1 ? 'text-[#F3D878]' : 'text-[#0F6E41]'}`}>{outcome.kicker}</p>
                <h3 className="mt-2 text-xl font-black">{outcome.title}</h3>
                <p className={`mt-3 flex-1 text-sm leading-6 ${index === 1 ? 'text-emerald-100/70' : 'text-slate-600'}`}>{outcome.description}</p>
                <div className={`mt-8 rounded-2xl px-4 py-3 text-sm font-black ${index === 1 ? 'bg-white/10 text-white' : 'bg-[#FBF6E2] text-[#806219]'}`}>
                  {outcome.metric}
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-slate-500">
          Named student and parent testimonials are published only after verified enrollment feedback and consent; this section describes platform outcomes, not fabricated reviews.
        </p>
      </div>
    </section>
  );
}
