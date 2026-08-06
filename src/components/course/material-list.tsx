'use client';

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Paperclip,
} from 'lucide-react';
import { formatMaterialFileSize } from '@/lib/lms/material-types';
import { cn } from '@/lib/utils';

export type CourseMaterialItem = {
  fileSize: number | null;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
};

type MaterialTab = 'course' | 'lesson';

function MaterialRows({ materials }: { materials: CourseMaterialItem[] }) {
  if (!materials.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-600">
        No attachments in this section yet.
      </p>
    );
  }

  return (
    <ul className="flex min-w-0 flex-col gap-2">
      {materials.map((material) => (
        <li
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center"
          key={material.id}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
            {material.fileType === 'ZIP' ? (
              <FileArchive className="size-5" aria-hidden="true" />
            ) : (
              <FileText className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-zinc-200">
              {material.title}
            </span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-zinc-600">
              {material.fileType} · {formatMaterialFileSize(material.fileSize)}
            </span>
          </span>
          <span className="grid shrink-0 grid-cols-2 gap-2">
            <a
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-white/5 hover:text-white"
              href={material.fileUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Preview
            </a>
            <a
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black hover:bg-zinc-200"
              href={`/api/lms/materials/${material.id}/download`}
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MaterialList({
  courseMaterials,
  lessonMaterials,
}: {
  courseMaterials: CourseMaterialItem[];
  lessonMaterials: CourseMaterialItem[];
}) {
  const [activeTab, setActiveTab] = useState<MaterialTab>(
    lessonMaterials.length ? 'lesson' : 'course',
  );
  const materials =
    activeTab === 'lesson' ? lessonMaterials : courseMaterials;

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
          <Paperclip className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-black">Course Resources &amp; Attachments</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Preview lesson files or download them for offline study.
          </p>
        </span>
      </div>

      <div
        aria-label="Material sections"
        className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black p-1"
        role="tablist"
      >
        {(
          [
            ['lesson', `This lesson (${lessonMaterials.length})`],
            ['course', `Whole course (${courseMaterials.length})`],
          ] as const
        ).map(([tab, label]) => (
          <button
            aria-selected={activeTab === tab}
            className={cn(
              'min-w-0 truncate rounded-lg px-3 py-2 text-xs font-black transition',
              activeTab === tab
                ? 'bg-violet-400 text-black'
                : 'text-zinc-500 hover:text-white',
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3" role="tabpanel">
        <MaterialRows materials={materials} />
      </div>
    </section>
  );
}
