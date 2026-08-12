'use client';

import { useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  formatMaterialFileSize,
  MATERIAL_ACCEPT,
  MAX_MATERIAL_UPLOAD_BYTES,
  type MaterialFileType,
} from '@/lib/lms/material-types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/UI/dialog';

export type TeacherMaterial = {
  fileSize: number | null;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
};

type MaterialUploaderProps = {
  courseId?: string;
  initialMaterials: TeacherMaterial[];
  lessonId?: string;
  moduleId?: string;
  title: string;
};

type PresignResponse = {
  error?: string;
  fileType?: MaterialFileType;
  key?: string;
  publicUrl?: string;
  requiredHeaders?: Record<string, string>;
  uploadUrl?: string;
};

function MaterialIcon({ fileType }: { fileType: string }) {
  return <FileText className="size-5" aria-hidden="true" />;
}

export function MaterialUploader({
  courseId,
  initialMaterials,
  lessonId,
  moduleId,
  title,
}: MaterialUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState(initialMaterials);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<TeacherMaterial | null>(null);

  async function upload(file: File) {
    setError('');
    setPendingFile(file.name);

    try {
      if (file.size <= 0 || file.size > MAX_MATERIAL_UPLOAD_BYTES) {
        throw new Error('Choose a document between 1 byte and 50 MiB.');
      }

      const presignRequest = await fetch('/api/storage/presigned', {
        body: JSON.stringify({
          contentType: file.type,
          courseId,
          fileName: file.name,
          lessonId,
          moduleId,
          size: file.size,
          uploadKind: 'material',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const presign = (await presignRequest.json()) as PresignResponse;

      if (
        !presignRequest.ok ||
        !presign.uploadUrl ||
        !presign.publicUrl ||
        !presign.key ||
        !presign.fileType
      ) {
        throw new Error(presign.error ?? 'Unable to prepare the upload.');
      }

      const uploadRequest = await fetch(presign.uploadUrl, {
        body: file,
        headers: presign.requiredHeaders,
        method: 'PUT',
      });
      if (!uploadRequest.ok) {
        throw new Error(
          'R2 rejected the upload. Check the bucket CORS configuration.',
        );
      }

      const saveRequest = await fetch('/api/lms/materials', {
        body: JSON.stringify({
          courseId,
          fileSize: file.size,
          fileType: presign.fileType,
          lessonId,
          moduleId,
          objectKey: presign.key,
          title: file.name,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const saved = (await saveRequest.json().catch(() => ({}))) as {
        error?: string;
        material?: TeacherMaterial;
      };
      if (!saveRequest.ok || !saved.material) {
        throw new Error(saved.error ?? 'Unable to save the uploaded material.');
      }

      setMaterials((current) => [saved.material!, ...current]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The material upload failed.',
      );
    } finally {
      setPendingFile('');
      setDragging(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(material: TeacherMaterial) {
    setError('');
    setDeletingId(material.id);

    try {
      const response = await fetch(`/api/lms/materials/${material.id}`, {
        method: 'DELETE',
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to delete this material.');
      }
      setMaterials((current) =>
        current.filter((item) => item.id !== material.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete this material.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          PDF, PPTX, DOCX, or XLSX · up to 50 MiB
        </p>
      </div>

      <label
        className={cn(
          'flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition',
          dragging
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-300 bg-slate-50 hover:border-sky-400',
          pendingFile && 'pointer-events-none opacity-70',
        )}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          {pendingFile ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-5" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-700">
            {pendingFile ? `Uploading ${pendingFile}…` : 'Drop a file or choose one'}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            Secure direct upload to Cloudflare R2
          </span>
        </span>
        <input
          ref={inputRef}
          accept={MATERIAL_ACCEPT}
          className="sr-only"
          disabled={Boolean(pendingFile)}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          type="file"
        />
      </label>

      {materials.length ? (
        <ul className="flex min-w-0 flex-col gap-2">
          {materials.map((material) => (
            <li
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
              key={material.id}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <MaterialIcon fileType={material.fileType} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-700">
                  {material.title}
                </span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {material.fileType} · {formatMaterialFileSize(material.fileSize)}
                </span>
              </span>
              <span className="grid shrink-0 grid-cols-3 gap-1">
                <button
                  aria-label={`Preview ${material.title}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-sky-700"
                  onClick={() => setPreviewing(material)}
                  type="button"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </button>
                <a
                  aria-label={`Download ${material.title}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-sky-700"
                  href={`/api/lms/materials/${material.id}/download`}
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>
                <button
                  aria-label={`Delete ${material.title}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  disabled={deletingId === material.id}
                  onClick={() => void remove(material)}
                  type="button"
                >
                  {deletingId === material.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          No materials uploaded yet.
        </p>
      )}

      {error ? (
        <p aria-live="polite" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <Dialog open={Boolean(previewing)} onOpenChange={(open) => { if (!open) setPreviewing(null); }}>
        {previewing ? (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate">{previewing.title}</DialogTitle>
              <DialogDescription>{previewing.fileType} · {formatMaterialFileSize(previewing.fileSize)}</DialogDescription>
            </DialogHeader>
            {previewing.fileType === 'PDF' ? (
              <iframe className="h-[60dvh] w-full rounded-xl border border-slate-200 bg-white" src={previewing.fileUrl} title={`Preview ${previewing.title}`} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">This file type opens in its native viewer.</div>
            )}
            <a className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700" href={previewing.fileUrl} rel="noopener noreferrer" target="_blank"><ExternalLink className="size-4" /> Open in new tab</a>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
