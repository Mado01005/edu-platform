'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { enrollCourseAction } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { OnlineCheckoutModal, type CheckoutChannel } from '@/components/checkout/online-checkout-modal';

export function CourseAccessActions({
  channels,
  course,
  enrolled,
}: {
  channels: CheckoutChannel[];
  course: {
    id: string;
    modules: { id: string; priceEGP: string; purchased: boolean; title: string }[];
    priceEGP: string;
    priceUSD: string;
    title: string;
  };
  enrolled: boolean;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const paid = Number(course.priceEGP) > 0 || Number(course.priceUSD) > 0;
  const enroll = enrollCourseAction.bind(null, course.id);

  const hasChapterAccess = course.modules.some((module) => module.purchased);
  const hasStandaloneChapters = course.modules.some((module) => Number(module.priceEGP) > 0);

  if (enrolled || (!paid && !hasStandaloneChapters)) {
    return (
      <form action={enroll} className="w-full">
        <ActionSubmitButton className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#063B22]" pendingLabel={enrolled ? 'Opening…' : 'Enrolling…'}>
          {enrolled || hasChapterAccess ? 'Continue course' : 'Start free course'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </ActionSubmitButton>
      </form>
    );
  }

  return (
    <>
      {hasChapterAccess ? <form action={enroll} className="mb-2 w-full"><ActionSubmitButton className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#084B2B] px-4 text-sm font-semibold text-[#084B2B]" pendingLabel="Opening…">Continue purchased chapter <ArrowRight className="size-4" /></ActionSubmitButton></form> : null}
      <button className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#063B22]" onClick={() => setCheckoutOpen(true)} type="button">
        Buy term or chapter
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
      {checkoutOpen ? <OnlineCheckoutModal channels={channels} course={course} onClose={() => setCheckoutOpen(false)} /> : null}
    </>
  );
}
