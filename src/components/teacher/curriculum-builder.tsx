'use client';

import { useState } from 'react';
import type { ContentType } from '@prisma/client';
import { ChevronDown, FileText, GripVertical, Plus, Save } from 'lucide-react';
import { createLessonAction, createModuleAction, updateLessonAction } from '@/app/lms/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { R2UploadField } from '@/components/lms/R2UploadField';
import { MaterialUploader } from '@/components/teacher/material-uploader';
import type { TeacherCourse, TeacherLesson, TeacherModule } from '@/components/teacher/course-editor-types';

const VIDEO_TYPES: ContentType[] = ['VIMEO', 'YOUTUBE', 'R2_VIDEO'];

function cairoInputValue(value: string | null) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
}

function badgeFor(lesson: TeacherLesson) {
  if (VIDEO_TYPES.includes(lesson.contentType)) {
    return { label: 'Video Lesson', icon: '🎥', detail: `${lesson.durationMin ?? '—'} min · ${lesson.videoUrl ? 'Ready' : 'Needs upload'}` };
  }
  if (lesson.contentType === 'QUIZ') {
    return { label: 'Quiz / Exam', icon: '📝', detail: `${lesson.assignment?.questionCount ?? 0} questions` };
  }
  if (lesson.contentType === 'ASSIGNMENT') {
    return { label: 'Assignment / Homework', icon: '📥', detail: lesson.materials.length ? 'Worksheet attached' : 'No worksheet yet' };
  }
  return { label: lesson.contentType === 'PDF' ? 'PDF / Resource' : 'Text Lesson', icon: '📄', detail: lesson.contentType.replaceAll('_', ' ') };
}

function LessonEditor({ lesson }: { lesson: TeacherLesson }) {
  const [type, setType] = useState<ContentType>(lesson.contentType);
  const badge = badgeFor(lesson);

  return (
    <details className="group min-w-0 rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 p-3">
        <GripVertical className="size-4 shrink-0 text-slate-400" aria-label="Drag lesson" />
        <span aria-hidden="true" className="shrink-0">{badge.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">{lesson.title}</span>
          <span className="block truncate text-[10px] text-slate-500">{badge.detail}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 sm:block">{badge.label}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <form action={updateLessonAction.bind(null, lesson.id)} className="flex min-w-0 flex-col gap-3 border-t border-slate-200 p-3">
        <label className="text-xs font-bold text-slate-600">Lesson Title
          <input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.title} name="title" required />
        </label>
        <label className="text-xs font-bold text-slate-600">Lesson Type
          <select className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" name="contentType" onChange={(event) => setType(event.target.value as ContentType)} value={type}>
            <option value="VIMEO">Vimeo video</option><option value="YOUTUBE">YouTube video</option><option value="R2_VIDEO">Uploaded video</option><option value="QUIZ">Quiz / Exam</option><option value="ASSIGNMENT">Assignment / Homework</option><option value="PDF">PDF / Resource</option><option value="TEXT">Text lesson</option>
          </select>
        </label>
        {type === 'VIMEO' || type === 'YOUTUBE' ? <label className="text-xs font-bold text-slate-600">Video URL<input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.videoUrl ?? ''} name="videoUrl" type="url" /></label> : null}
        {type === 'R2_VIDEO' ? <R2UploadField accept="video" initialUrl={lesson.videoUrl} label="Video file" lessonId={lesson.id} name="r2VideoUrl" /> : null}
        {type === 'R2_VIDEO' ? (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-bold text-slate-700">
              Optional low-bandwidth renditions
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Upload pre-encoded versions to let students reduce mobile data use. Missing qualities remain unavailable in the player.
            </p>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              <R2UploadField accept="video" initialUrl={lesson.videoUrl360} label="360p · Data Saver" lessonId={lesson.id} name="videoUrl360" />
              <R2UploadField accept="video" initialUrl={lesson.videoUrl480} label="480p · SD" lessonId={lesson.id} name="videoUrl480" />
              <R2UploadField accept="video" initialUrl={lesson.videoUrl720} label="720p · HD" lessonId={lesson.id} name="videoUrl720" />
              <R2UploadField accept="video" initialUrl={lesson.videoUrl1080} label="1080p · HD" lessonId={lesson.id} name="videoUrl1080" />
            </div>
          </details>
        ) : null}
        {VIDEO_TYPES.includes(type) ? <label className="text-xs font-bold text-slate-600">Duration (Minutes)<input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.durationMin ?? ''} max="1440" min="1" name="durationMin" type="number" /></label> : null}
        {type === 'PDF' ? <R2UploadField accept="pdf" initialUrl={lesson.pdfUrl} label="PDF resource" lessonId={lesson.id} name="pdfUrl" /> : null}
        {type === 'TEXT' ? <label className="text-xs font-bold text-slate-600">Lesson Content<textarea className="mt-1 min-h-40 w-full min-w-0 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.textContent ?? ''} name="textContent" /></label> : null}
        {type === 'QUIZ' || type === 'ASSIGNMENT' ? <>
          <label className="text-xs font-bold text-slate-600">Instructions<textarea className="mt-1 min-h-28 w-full min-w-0 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.assignment?.instructions ?? ''} name="instructions" placeholder="Explain what students need to submit." /></label>
          {type === 'QUIZ' ? <label className="text-xs font-bold text-slate-600">Questions Count<input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={lesson.assignment?.questionCount ?? 0} max="500" min="0" name="questionCount" type="number" /></label> : null}
          <label className="text-xs font-bold text-slate-600">Due Date & Time (Cairo)<input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue={cairoInputValue(lesson.assignment?.dueAt ?? null)} name="dueAt" type="datetime-local" /></label>
        </> : null}
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input defaultChecked={lesson.isFree} name="isFree" type="checkbox" /> Free preview lesson</label>
        <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white hover:bg-sky-700" pendingLabel="Saving lesson…"><Save className="size-4" /> Save lesson</ActionSubmitButton>
      </form>
      <div className="border-t border-slate-200 p-3"><MaterialUploader initialMaterials={lesson.materials} lessonId={lesson.id} title={type === 'ASSIGNMENT' ? 'Assignment worksheet & references' : 'Lesson attachments'} /></div>
    </details>
  );
}

function ModuleCard({ module }: { module: TeacherModule }) {
  return (
    <details className="group min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm" open>
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 p-4">
        <GripVertical className="size-5 shrink-0 text-slate-400" aria-label="Drag module" />
        <span className="min-w-0 flex-1 truncate font-black">{module.title}</span>
        <span className="shrink-0 text-xs text-slate-500">{module.lessons.length} lessons</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="flex min-w-0 flex-col gap-3 border-t border-slate-200 p-3">
        {module.lessons.map((lesson) => <LessonEditor key={lesson.id} lesson={lesson} />)}
        {!module.lessons.length ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">No lessons added yet. Use the form below to add the first lesson.</p> : null}
        <form action={createLessonAction.bind(null, module.id)} className="flex min-w-0 flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <label className="text-xs font-bold text-slate-600">New Lesson Title<input className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" name="title" placeholder="e.g. Fractions practice" required /></label>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <label className="text-xs font-bold text-slate-600">
              Lesson Type
              <select className="mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" defaultValue="R2_VIDEO" name="contentType">
                <option value="R2_VIDEO">Video lesson</option>
                <option value="TEXT">Text lesson</option>
                <option value="PDF">PDF resource</option>
                <option value="QUIZ">Quiz</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="VIMEO">Vimeo video</option>
                <option value="YOUTUBE">YouTube video</option>
              </select>
            </label>
            <ActionSubmitButton className="mt-auto rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700" pendingLabel="Adding lesson…">+ Add Lesson</ActionSubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}

export function CurriculumBuilder({ course }: { course: TeacherCourse }) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-black"><FileText className="size-5 text-sky-700" /> Modules &amp; Lessons</h2>
        <p className="mt-2 text-sm text-slate-600">Create a module, then add lessons and resources inside it.</p>
      </header>
      {course.modules.map((module) => <ModuleCard key={module.id} module={module} />)}
      <form action={createModuleAction.bind(null, course.id)} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-3 sm:flex-row">
        <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">New Module Title<input className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-500" name="title" placeholder="Module 1: Foundations" required /></label>
        <ActionSubmitButton className="mt-auto flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700" pendingLabel="Adding module…"><Plus className="size-4" /> Add Module</ActionSubmitButton>
      </form>
    </section>
  );
}
