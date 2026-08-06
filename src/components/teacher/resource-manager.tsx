'use client';

import { Boxes, FolderOpen } from 'lucide-react';
import { MaterialUploader } from '@/components/teacher/material-uploader';
import type { TeacherCourse } from '@/components/teacher/course-editor-types';

export function ResourceManager({ course }: { course: TeacherCourse }) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      <header className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="flex items-center gap-2 font-black">
          <FolderOpen className="size-5 text-violet-300" /> Course resources
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Keep files available to the whole course or attach them to one module.
        </p>
      </header>
      <MaterialUploader
        courseId={course.id}
        initialMaterials={course.materials}
        title="General course resources"
      />
      {course.modules.map((module) => (
        <details className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950" key={module.id}>
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-black">
            <Boxes className="size-5 shrink-0 text-cyan-300" />
            <span className="min-w-0 flex-1 truncate">{module.title}</span>
            <span className="shrink-0 text-xs text-zinc-500">{module.materials.length} files</span>
          </summary>
          <div className="border-t border-white/10 p-3">
            <MaterialUploader
              initialMaterials={module.materials}
              moduleId={module.id}
              title={`Files for ${module.title}`}
            />
          </div>
        </details>
      ))}
    </section>
  );
}
