'use client';

import { useActionState } from 'react';
import { BookPlus } from 'lucide-react';
import {
  createCourseAction,
  type CourseActionState,
} from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';

const initialState: CourseActionState = {
  error: null,
  success: false,
};

export function CourseCreateForm() {
  const [state, action] = useActionState(createCourseAction, initialState);

  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-md min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      id="new-course"
    >
      <div className="flex items-center gap-2 text-sm font-black">
        <BookPlus className="size-4 text-sky-700" aria-hidden="true" />
        Create a course
      </div>
      <input
        className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        maxLength={200}
        name="title"
        placeholder="Course title"
        required
      />
      <textarea
        className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        maxLength={10_000}
        name="description"
        placeholder="What will students learn?"
      />
      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      <ActionSubmitButton
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700"
        pendingLabel="Creating course…"
      >
        Create course
      </ActionSubmitButton>
    </form>
  );
}
