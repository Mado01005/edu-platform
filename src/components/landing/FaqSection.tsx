import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    answer:
      'Yes. Published courses can expose Lesson 1 as a protected guest preview. Prices remain hidden on this storefront until you sign in.',
    question: 'Can I watch a lesson before I join?',
  },
  {
    answer:
      'Each student account supports two active devices. Signing in on a third device silently retires the oldest active device session.',
    question: 'How does the two-device policy work?',
  },
  {
    answer:
      'Use the parent mobile number saved during student onboarding. A passwordless SMS code opens a read-only view of progress, attendance, exams, and homework feedback.',
    question: 'How do parents open the parent portal?',
  },
  {
    answer:
      'Choose an eligible term or chapter, copy the active InstaPay or Vodafone Cash number, transfer the displayed amount, and upload the receipt screenshot for review.',
    question: 'How do InstaPay and Vodafone Cash payments work?',
  },
] as const;

export function FaqSection() {
  return (
    <section className="bg-[#F8FAF8] py-20" id="faq">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <div className="max-w-lg">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">
            Before you begin
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
            Clear answers for students and parents.
          </h2>
          <p className="mt-5 text-sm leading-7 text-slate-600">
            Preview first, understand the access policy, then choose the path
            that fits this term.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              className="group rounded-2xl border border-emerald-950/10 bg-white p-5 open:border-[#D4AF37]/60 open:bg-[#FBF6E2]"
              key={faq.question}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-[#1A2E22] outline-none marker:hidden focus-visible:ring-4 focus-visible:ring-emerald-100">
                <span>{faq.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-[#084B2B] group-open:rotate-180"
                />
              </summary>
              <p className="max-w-3xl border-t border-emerald-950/10 pt-4 text-sm leading-7 text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
