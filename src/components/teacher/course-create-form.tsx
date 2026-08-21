'use client';

import type { GradeLevel } from '@prisma/client';
import { useActionState, useMemo, useState } from 'react';
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

export type CourseSubjectOption = {
  grade: GradeLevel;
  id: string;
  name: string;
};

const grades = Array.from(
  { length: 12 },
  (_, index) => `GRADE_${index + 1}` as GradeLevel,
);
const EMPTY_SUBJECTS: CourseSubjectOption[] = [];

export function CourseCreateForm({
  requireSubject = false,
  subjects = EMPTY_SUBJECTS,
}: {
  requireSubject?: boolean;
  subjects?: CourseSubjectOption[];
}) {
  const [state, action] = useActionState(createCourseAction, initialState);
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | ''>('');
  const matchingSubjects = useMemo(
    () => subjects.filter((subject) => subject.grade === gradeLevel),
    [gradeLevel, subjects],
  );

  return (
    <form
      action={action}
      className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm"
      id="new-course"
    >
      <div className="flex items-center gap-2 text-sm font-black">
        <BookPlus className="size-4 text-[#084B2B]" aria-hidden="true" />
        Create a course
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs font-bold text-slate-700">
          Grade Level
          <select
            className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
            name="gradeLevel"
            onChange={(event) =>
              setGradeLevel(event.target.value as GradeLevel | '')
            }
            required={requireSubject}
            value={gradeLevel}
          >
            <option value="">Choose grade</option>
            {grades.map((grade, index) => (
              <option key={grade} value={grade}>
                Grade {index + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs font-bold text-slate-700">
          Subject
          <select
            className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
            disabled={!gradeLevel}
            name="subjectId"
            required={requireSubject}
          >
            <option value="">
              {!gradeLevel
                ? 'Choose grade first'
                : matchingSubjects.length
                  ? 'Choose subject'
                  : 'No subjects in this grade'}
            </option>
            {matchingSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
        maxLength={200}
        name="title"
        placeholder="Course title"
        required
      />
      <textarea
        className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-2 focus:ring-emerald-100"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 py-3 text-sm font-bold text-white hover:bg-[#063B22]"
        pendingLabel="Creating course…"
      >
        Create course
      </ActionSubmitButton>
    </form>
  );
}
