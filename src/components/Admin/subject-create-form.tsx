'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookPlus } from 'lucide-react';
import {
  createSubjectAction,
  type SubjectActionState,
} from '@/app/admin/curriculum/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';

const initialState: SubjectActionState = { error: null, success: false };
const grades = Array.from({ length: 12 }, (_, index) => `GRADE_${index + 1}`);

export function SubjectCreateForm() {
  const [state, action] = useActionState(createSubjectAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form
      action={action}
      className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5"
      id="new-subject"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <BookPlus className="size-4 text-[#084B2B]" aria-hidden="true" />
        Create a subject
      </div>
      <label className="text-xs font-bold text-slate-700">
        Subject Name
        <input
          className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
          maxLength={120}
          name="name"
          placeholder="e.g. Mathematics"
          required
        />
      </label>
      <label className="text-xs font-bold text-slate-700">
        Grade Level
        <select
          className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
          defaultValue=""
          name="grade"
          required
        >
          <option disabled value="">
            Choose grade level
          </option>
          {grades.map((grade, index) => (
            <option key={grade} value={grade}>
              Grade {index + 1}
            </option>
          ))}
        </select>
      </label>
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Subject created. It is now available in the course form.
        </p>
      ) : null}
      <ActionSubmitButton
        className="flex w-full items-center justify-center rounded-xl bg-[#084B2B] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md"
        pendingLabel="Creating subject…"
      >
        + Create New Subject
      </ActionSubmitButton>
    </form>
  );
}
