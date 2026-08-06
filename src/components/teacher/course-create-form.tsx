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
      className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
      id="new-course"
    >
      <div className="flex items-center gap-2 text-sm font-black">
        <BookPlus className="size-4 text-violet-300" aria-hidden="true" />
        Create a course
      </div>
      <input
        className="w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-violet-400"
        maxLength={200}
        name="title"
        placeholder="Course title"
        required
      />
      <textarea
        className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-violet-400"
        maxLength={10_000}
        name="description"
        placeholder="What will students learn?"
      />
      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200"
        >
          {state.error}
        </p>
      ) : null}
      <ActionSubmitButton
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black"
        pendingLabel="Creating course…"
      >
        Create course
      </ActionSubmitButton>
    </form>
  );
}
