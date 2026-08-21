'use client';

import { useState } from 'react';
import { FileArchive, FileText, Paperclip } from 'lucide-react';
import { DocumentViewer } from '@/components/course/document-viewer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import type { CoursePlayerMaterial } from '@/lib/lms/course-player';
import { formatMaterialFileSize } from '@/lib/lms/material-types';

function MaterialIcon({ fileType }: { fileType: string }) {
  return fileType.toUpperCase() === 'ZIP' ? (
    <FileArchive aria-hidden="true" className="size-5" />
  ) : (
    <FileText aria-hidden="true" className="size-5" />
  );
}

export function LessonResources({
  materials,
}: {
  materials: CoursePlayerMaterial[];
}) {
  const [previewing, setPreviewing] = useState<CoursePlayerMaterial | null>(null);

  if (!materials.length) return null;

  return (
    <section className="min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#084B2B]">
          <Paperclip aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">Resources &amp; attachments</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Open lesson documents without leaving the course player.
          </p>
        </span>
      </div>

      <ul className="mt-4 flex min-w-0 flex-col gap-2">
        {materials.map((material) => (
          <li
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-[#084B2B] shadow-sm transition-all hover:border-[#084B2B] sm:flex-row sm:items-center sm:justify-between"
            key={material.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#084B2B]">
                <MaterialIcon fileType={material.fileType} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  {material.title}
                </h3>
                <span className="text-xs text-slate-500">
                  {material.fileType} · {formatMaterialFileSize(material.fileSize)}
                </span>
              </div>
            </div>
            <button
              className="min-h-9 shrink-0 rounded-lg bg-[#084B2B] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#063B22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B] focus-visible:ring-offset-2"
              onClick={() => setPreviewing(material)}
              type="button"
            >
              Read in App
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPreviewing(null);
        }}
        open={Boolean(previewing)}
      >
        {previewing ? (
          <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="truncate">{previewing.title}</DialogTitle>
              <DialogDescription>
                Protected in-app document viewer
              </DialogDescription>
            </DialogHeader>
            <DocumentViewer
              fileType={previewing.fileType}
              title={previewing.title}
              url={previewing.fileUrl}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
