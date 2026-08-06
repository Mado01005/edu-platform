'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { updateCourseAction, type CourseActionState } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { CourseEditorTabs } from '@/components/teacher/course-editor-tabs';
import { CurriculumBuilder } from '@/components/teacher/curriculum-builder';
import { ResourceManager } from '@/components/teacher/resource-manager';
import type { TeacherCourse } from '@/components/teacher/course-editor-types';
import { ZoomScheduler } from '@/components/teacher/zoom-scheduler';
import { Tabs, TabsContent } from '@/components/UI/tabs';

const grades = Array.from({ length: 12 }, (_, index) => `GRADE_${index + 1}`);
const initialState: CourseActionState = { error: null, success: false };

function BasicDetails({ course }: { course: TeacherCourse }) {
  const [state, action] = useActionState(updateCourseAction.bind(null, course.id), initialState);
  return (
    <form action={action} className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <h2 className="font-black">Basic course details</h2>
      <label className="text-sm font-bold text-zinc-300">Course Title<input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.title} name="title" required /></label>
      <label className="text-sm font-bold text-zinc-300">Description<textarea className="mt-2 min-h-32 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.description ?? ''} name="description" /></label>
      <label className="text-sm font-bold text-zinc-300">Thumbnail URL<input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.imageUrl ?? ''} name="imageUrl" placeholder="Cloudflare R2 image URL" type="url" /></label>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="min-w-0 text-sm font-bold text-zinc-300">Price (EGP)<input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.priceEGP} min="0" name="priceEGP" required step="0.01" type="number" /></label>
        <label className="min-w-0 text-sm font-bold text-zinc-300">Price (USD)<input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.priceUSD} min="0" name="priceUSD" required step="0.01" type="number" /></label>
        <label className="min-w-0 text-sm font-bold text-zinc-300">Grade Level<select className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={course.gradeLevel ?? ''} name="gradeLevel"><option value="">All grades</option>{grades.map((grade, index) => <option key={grade} value={grade}>Grade {index + 1}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input defaultChecked={course.isPublished} name="isPublished" type="checkbox" /> Published in catalog</label>
      {state.error ? <p aria-live="polite" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p> : null}
      {state.success ? <p aria-live="polite" className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">Course details saved.</p> : null}
      <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 font-black text-black" pendingLabel="Saving course…"><Save className="size-4" /> Save Basic Details</ActionSubmitButton>
    </form>
  );
}

export function CourseEditor({ course }: { course: TeacherCourse }) {
  return (
    <Tabs className="w-full min-w-0" defaultValue="details">
      <CourseEditorTabs />
      <TabsContent value="details"><BasicDetails course={course} /></TabsContent>
      <TabsContent value="curriculum"><CurriculumBuilder course={course} /></TabsContent>
      <TabsContent value="resources"><ResourceManager course={course} /></TabsContent>
      <TabsContent value="zoom"><ZoomScheduler course={course} /></TabsContent>
    </Tabs>
  );
}
