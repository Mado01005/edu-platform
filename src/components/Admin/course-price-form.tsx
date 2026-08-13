'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import {
  updateCoursePriceAction,
  type CourseActionState,
} from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';

const initialState: CourseActionState = { error: null, success: false };

export function CoursePriceForm({
  course,
}: {
  course: { id: string; priceEGP: string; priceUSD: string; title: string };
}) {
  const [state, action] = useActionState(
    updateCoursePriceAction.bind(null, course.id),
    initialState,
  );

  return (
    <form
      action={action}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="truncate font-black text-slate-900">{course.title}</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Price (EGP)
          <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" defaultValue={course.priceEGP} min="0" name="priceEGP" required step="0.01" type="number" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Price (USD)
          <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" defaultValue={course.priceUSD} min="0" name="priceUSD" required step="0.01" type="number" />
        </label>
      </div>
      {state.error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Prices saved.</p> : null}
      <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white" pendingLabel="Saving prices…">
        <Save className="size-4" /> Save prices
      </ActionSubmitButton>
    </form>
  );
}
