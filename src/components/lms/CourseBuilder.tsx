'use client';

import { useMemo, useState } from 'react';
import type { ContentType } from '@prisma/client';
import {
  CalendarPlus,
  ChevronDown,
  GripVertical,
  FileText,
  Plus,
  Radio,
  Save,
} from 'lucide-react';
import {
  createLessonAction,
  createModuleAction,
  reorderLessonsAction,
  reorderModulesAction,
  scheduleZoomAction,
  updateCourseAction,
  updateLessonAction,
} from '@/app/lms/actions';
import { R2UploadField } from '@/components/lms/R2UploadField';
import { LocalDateTime } from '@/components/lms/LocalDateTime';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';

type LessonData = {
  id: string;
  title: string;
  position: number;
  contentType: ContentType;
  videoUrl: string | null;
  pdfUrl: string | null;
  textContent: string | null;
  isFree: boolean;
};

type ModuleData = {
  id: string;
  title: string;
  position: number;
  lessons: LessonData[];
};

type CourseData = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  priceEGP: string;
  priceUSD: string;
  modules: ModuleData[];
  zoomSessions: {
    id: string;
    title: string;
    startTime: string;
    duration: number;
  }[];
};

function LessonEditor({
  lesson,
}: {
  lesson: LessonData;
}) {
  const [type, setType] = useState<ContentType>(lesson.contentType);
  const save = updateLessonAction.bind(null, lesson.id);

  return (
    <details className="min-w-0 rounded-xl border border-white/10 bg-black/60">
      <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 p-3">
        <GripVertical
          className="lesson-drag-handle size-4 shrink-0 cursor-grab text-zinc-600"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {lesson.title}
        </span>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-zinc-400">
          {lesson.contentType.replace('_', ' ')}
        </span>
        <ChevronDown className="size-4 shrink-0 text-zinc-600" />
      </summary>

      <form action={save} className="flex min-w-0 flex-col gap-3 border-t border-white/10 p-3">
        <input
          className="w-full min-w-0 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
          defaultValue={lesson.title}
          name="title"
          required
        />
        <select
          className="w-full min-w-0 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
          name="contentType"
          onChange={(event) => setType(event.target.value as ContentType)}
          value={type}
        >
          <option value="VIMEO">Vimeo</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="R2_VIDEO">R2 video</option>
          <option value="PDF">PDF</option>
          <option value="TEXT">Text</option>
        </select>

        {type === 'VIMEO' || type === 'YOUTUBE' ? (
          <input
            className="w-full min-w-0 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            defaultValue={lesson.videoUrl ?? ''}
            name="videoUrl"
            placeholder={`${type === 'VIMEO' ? 'Vimeo' : 'YouTube'} URL`}
            type="url"
          />
        ) : null}

        {type === 'R2_VIDEO' ? (
          <R2UploadField
            accept="video"
            initialUrl={lesson.videoUrl}
            label="Video file"
            lessonId={lesson.id}
            name="r2VideoUrl"
          />
        ) : null}

        {type === 'PDF' ? (
          <R2UploadField
            accept="pdf"
            initialUrl={lesson.pdfUrl}
            label="PDF resource"
            lessonId={lesson.id}
            name="pdfUrl"
          />
        ) : null}

        {type === 'TEXT' ? (
          <textarea
            className="min-h-40 w-full min-w-0 resize-y rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            defaultValue={lesson.textContent ?? ''}
            name="textContent"
            placeholder="Lesson content"
          />
        ) : null}

        <label className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <input defaultChecked={lesson.isFree} name="isFree" type="checkbox" />
          Free preview lesson
        </label>
        <ActionSubmitButton
          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-black"
          pendingLabel="Saving lesson…"
        >
          <Save className="size-4" />
          Save lesson
        </ActionSubmitButton>
      </form>
    </details>
  );
}

function ModuleCard({
  module,
}: {
  module: ModuleData;
}) {
  const [lessonIds, setLessonIds] = useState(module.lessons.map(({ id }) => id));
  const lessonsById = useMemo(
    () => new Map(module.lessons.map((lesson) => [lesson.id, lesson])),
    [module.lessons],
  );
  const createLesson = createLessonAction.bind(null, module.id);
  const [draggedLesson, setDraggedLesson] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState('');

  async function dropLesson(targetId: string) {
    if (!draggedLesson || draggedLesson === targetId) return;
    const next = [...lessonIds];
    next.splice(next.indexOf(draggedLesson), 1);
    next.splice(next.indexOf(targetId), 0, draggedLesson);
    setLessonIds(next);
    setDraggedLesson(null);
    setReorderError('');
    try {
      await reorderLessonsAction(module.id, next);
    } catch {
      setLessonIds(lessonIds);
      setReorderError('Lesson order was not saved. Please try again.');
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-3">
      <div className="flex min-w-0 items-center gap-2 pb-3">
        <GripVertical className="module-drag-handle size-5 shrink-0 cursor-grab text-zinc-600" />
        <h3 className="min-w-0 flex-1 truncate font-black">{module.title}</h3>
        <span className="shrink-0 text-xs text-zinc-600">
          {module.lessons.length} lessons
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {lessonIds.map((id) => {
          const lesson = lessonsById.get(id);
          if (!lesson) return null;

          return (
            <div
              draggable
              key={id}
              onDragStart={(event) => {
                event.stopPropagation();
                setDraggedLesson(id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.stopPropagation();
                void dropLesson(id);
              }}
            >
              <LessonEditor lesson={lesson} />
            </div>
          );
        })}
      </div>
      {reorderError ? (
        <p aria-live="polite" className="mt-2 text-xs text-red-300">
          {reorderError}
        </p>
      ) : null}

      <form action={createLesson} className="mt-3 grid min-w-0 grid-cols-[1fr_auto] gap-2">
        <input
          className="min-w-0 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm"
          name="title"
          placeholder="New lesson"
          required
        />
        <select
          aria-label="Lesson type"
          className="min-w-0 rounded-lg border border-white/10 bg-black px-2 text-xs"
          name="contentType"
        >
          <option value="VIMEO">Vimeo</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="R2_VIDEO">R2</option>
          <option value="PDF">PDF</option>
          <option value="TEXT">Text</option>
        </select>
        <ActionSubmitButton
          className="col-span-2 flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-black hover:bg-white/5"
          pendingLabel="Adding lesson…"
        >
          <Plus className="size-3" /> Add lesson
        </ActionSubmitButton>
      </form>
    </section>
  );
}

export function CourseBuilder({ course }: { course: CourseData }) {
  const [moduleIds, setModuleIds] = useState(course.modules.map(({ id }) => id));
  const modulesById = useMemo(
    () => new Map(course.modules.map((module) => [module.id, module])),
    [course.modules],
  );
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState('');
  const updateCourse = updateCourseAction.bind(null, course.id);
  const createModule = createModuleAction.bind(null, course.id);
  const scheduleZoom = scheduleZoomAction.bind(null, course.id);

  async function dropModule(targetId: string) {
    if (!draggedModule || draggedModule === targetId) return;
    const next = [...moduleIds];
    next.splice(next.indexOf(draggedModule), 1);
    next.splice(next.indexOf(targetId), 0, draggedModule);
    setModuleIds(next);
    setDraggedModule(null);
    setReorderError('');
    try {
      await reorderModulesAction(course.id, next);
    } catch {
      setModuleIds(moduleIds);
      setReorderError('Module order was not saved. Please try again.');
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <form action={updateCourse} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="font-black">Course settings</h2>
        <input
          className="w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"
          defaultValue={course.title}
          name="title"
          required
        />
        <textarea
          className="min-h-28 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"
          defaultValue={course.description ?? ''}
          name="description"
        />
        <input
          className="w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm"
          defaultValue={course.imageUrl ?? ''}
          name="imageUrl"
          placeholder="Course image URL"
          type="url"
        />
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Price EGP
            <input
              className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case tracking-normal text-white"
              defaultValue={course.priceEGP}
              min="0"
              name="priceEGP"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Price USD
            <input
              className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm normal-case tracking-normal text-white"
              defaultValue={course.priceUSD}
              min="0"
              name="priceUSD"
              required
              step="0.01"
              type="number"
            />
          </label>
        </div>
        <label className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <input defaultChecked={course.isPublished} name="isPublished" type="checkbox" />
          Published in catalog
        </label>
        <ActionSubmitButton
          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 text-sm font-black text-black"
          pendingLabel="Saving course…"
        >
          <Save className="size-4" /> Save course
        </ActionSubmitButton>
      </form>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black">Curriculum</h2>
          <p className="text-xs text-zinc-500">Drag modules and lessons to reorder.</p>
        </div>
        <FileText className="size-5 text-violet-300" />
      </div>

      {moduleIds.map((id) => {
        const courseModule = modulesById.get(id);
        if (!courseModule) return null;

        return (
          <div
            draggable
            key={id}
            onDragStart={() => setDraggedModule(id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void dropModule(id);
            }}
          >
            <ModuleCard module={courseModule} />
          </div>
        );
      })}
      {reorderError ? (
        <p aria-live="polite" className="text-xs text-red-300">
          {reorderError}
        </p>
      ) : null}

      <form action={createModule} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-dashed border-white/15 p-3">
        <input
          className="w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm"
          name="title"
          placeholder="Module title"
          required
        />
        <ActionSubmitButton
          className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-black hover:bg-white/5"
          pendingLabel="Adding module…"
        >
          <Plus className="size-4" /> Add module
        </ActionSubmitButton>
      </form>

      <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 font-black">
          <Radio className="size-4 text-emerald-300" />
          Zoom scheduler
        </div>
        {course.zoomSessions.map((session) => (
          <div className="rounded-xl bg-black p-3 text-sm" key={session.id}>
            <p className="font-bold">{session.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              <LocalDateTime date={session.startTime} /> · {session.duration} min
            </p>
          </div>
        ))}
        <form action={scheduleZoom} className="flex min-w-0 flex-col gap-2">
          <input className="w-full min-w-0 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" name="title" placeholder="Session title" required />
          <input className="w-full min-w-0 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" name="meetingUrl" placeholder="https://zoom.us/j/…" required type="url" />
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <label className="min-w-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Start time (UTC)
              <input className="mt-1 w-full min-w-0 rounded-lg border border-white/10 bg-black px-2 py-2 text-xs normal-case tracking-normal text-white" name="startTime" required type="datetime-local" />
            </label>
            <input className="min-w-0 rounded-lg border border-white/10 bg-black px-2 py-2 text-xs" defaultValue="60" max="480" min="5" name="duration" required type="number" />
          </div>
          <ActionSubmitButton
            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-sm font-black text-black"
            pendingLabel="Scheduling…"
          >
            <CalendarPlus className="size-4" /> Schedule class
          </ActionSubmitButton>
        </form>
      </section>
    </div>
  );
}
