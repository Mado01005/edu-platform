'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { updateCourseAction, type CourseActionState } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { CourseHeader } from '@/components/teacher/course-header';
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
    <form action={action} className="mx-auto flex w-full max-w-md min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-black">Basic course details</h2>
      <label className="text-sm font-bold text-slate-700">Course Title<input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue={course.title} name="title" required /></label>
      <label className="text-sm font-bold text-slate-700">Description<textarea className="mt-2 min-h-32 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue={course.description ?? ''} name="description" /></label>
      <label className="text-sm font-bold text-slate-700">Thumbnail URL<input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" defaultValue={course.imageUrl ?? ''} name="imageUrl" placeholder="Cloudflare R2 image URL" type="url" /></label>
      <div className="grid min-w-0 grid-cols-1 gap-3">
        <label className="min-w-0 text-sm font-bold text-slate-700">Grade Level<select className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500" defaultValue={course.gradeLevel ?? ''} name="gradeLevel"><option value="">All grades</option>{grades.map((grade, index) => <option key={grade} value={grade}>Grade {index + 1}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input defaultChecked={course.isPublished} name="isPublished" type="checkbox" /> Published in catalog</label>
      {state.error ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
      {state.success ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Course details saved.</p> : null}
      <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700" pendingLabel="Saving course…"><Save className="size-4" /> Save Basic Details</ActionSubmitButton>
    </form>
  );
}

export type CourseEditorTab = 'curriculum' | 'details' | 'resources' | 'zoom';

export function CourseEditor({
  course,
  initialTab = 'details',
}: {
  course: TeacherCourse;
  initialTab?: CourseEditorTab;
}) {
  return (
    <section
      aria-label="Course editor"
      className="custom-scrollbar h-[calc(100dvh-7rem)] min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]"
      data-course-editor-scroll
    >
      <Tabs className="min-h-full w-full min-w-0 gap-0" defaultValue={initialTab}>
        <div
          className="sticky top-0 z-30 min-w-0 border-b border-slate-200 bg-slate-50 pb-4"
          data-course-editor-sticky
        >
          <CourseHeader slug={course.slug} title={course.title} />
          <CourseEditorTabs />
        </div>
        <div className="min-w-0 pb-28 pt-4 md:pb-12">
          <TabsContent value="details"><BasicDetails course={course} /></TabsContent>
          <TabsContent value="curriculum"><CurriculumBuilder course={course} /></TabsContent>
          <TabsContent value="resources"><ResourceManager course={course} /></TabsContent>
          <TabsContent value="zoom"><ZoomScheduler course={course} /></TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
