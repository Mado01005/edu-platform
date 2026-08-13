'use client';

import { useState } from 'react';
import {
  Eye,
  FileArchive,
  FileText,
  Paperclip,
} from 'lucide-react';
import { DocumentViewer } from '@/components/course/document-viewer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/UI/dialog';
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

function MaterialRows({ materials, onPreview }: { materials: CourseMaterialItem[]; onPreview: (material: CourseMaterialItem) => void }) {
  if (!materials.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
        No attachments in this section yet.
      </p>
    );
  }

  return (
    <ul className="flex min-w-0 flex-col gap-2">
      {materials.map((material) => (
        <li
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
          key={material.id}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            {material.fileType === 'ZIP' ? (
              <FileArchive className="size-5" aria-hidden="true" />
            ) : (
              <FileText className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-slate-800">
              {material.title}
            </span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              {material.fileType} · {formatMaterialFileSize(material.fileSize)}
            </span>
          </span>
          <span className="grid shrink-0 grid-cols-1 gap-2">
            <button
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100"
              onClick={() => onPreview(material)}
              type="button"
            >
              <Eye className="size-3.5" aria-hidden="true" /> Read in app
            </button>
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
  const [previewing, setPreviewing] = useState<CourseMaterialItem | null>(null);
  const materials =
    activeTab === 'lesson' ? lessonMaterials : courseMaterials;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Paperclip className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-black">Course Resources &amp; Attachments</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Read course documents directly without leaving the lesson.
          </p>
        </span>
      </div>

      <div
        aria-label="Material sections"
        className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
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
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-500 hover:text-sky-700',
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
        <MaterialRows materials={materials} onPreview={setPreviewing} />
      </div>
      <Dialog open={Boolean(previewing)} onOpenChange={(open) => { if (!open) setPreviewing(null); }}>
        {previewing ? <DialogContent className="max-w-5xl"><DialogHeader><DialogTitle className="truncate">{previewing.title}</DialogTitle><DialogDescription>Protected course document viewer</DialogDescription></DialogHeader><DocumentViewer fileType={previewing.fileType} title={previewing.title} url={previewing.fileUrl} /></DialogContent> : null}
      </Dialog>
    </section>
  );
}
