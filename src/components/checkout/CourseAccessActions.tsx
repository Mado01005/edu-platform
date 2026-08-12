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
  course: { id: string; priceEGP: string; priceUSD: string; title: string };
  enrolled: boolean;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const paid = Number(course.priceEGP) > 0 || Number(course.priceUSD) > 0;
  const enroll = enrollCourseAction.bind(null, course.id);

  if (enrolled || !paid) {
    return (
      <form action={enroll} className="w-full">
        <ActionSubmitButton className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700" pendingLabel={enrolled ? 'Opening…' : 'Enrolling…'}>
          {enrolled ? 'Continue course' : 'Start free course'}
          <ArrowRight className="size-4" aria-hidden="true" />
        </ActionSubmitButton>
      </form>
    );
  }

  return (
    <>
      <button className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700" onClick={() => setCheckoutOpen(true)} type="button">
        Buy online
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
      {checkoutOpen ? <OnlineCheckoutModal channels={channels} course={course} onClose={() => setCheckoutOpen(false)} /> : null}
    </>
  );
}
