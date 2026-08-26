'use client';

import { useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  formatMaterialFileSize,
  MATERIAL_ACCEPT,
  MAX_MATERIAL_UPLOAD_BYTES,
  type MaterialFileType,
} from '@/lib/lms/material-types';
import { cn } from '@/lib/utils';
import { uploadWithProgress } from '@/lib/upload-handler';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/UI/dialog';

export type TeacherMaterial = {
  fileSize: number | null;
  fileType: string;
  fileUrl: string;
  id: string;
  isDownloadable: boolean;
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
  const uploadControllerRef = useRef<AbortController | null>(null);
  const [materials, setMaterials] = useState(initialMaterials);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<TeacherMaterial | null>(null);
  const [renaming, setRenaming] = useState<TeacherMaterial | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renamingPending, setRenamingPending] = useState(false);

  async function upload(file: File) {
    setError('');
    setPendingFile(file.name);
    setUploadProgress(0);
    const controller = new AbortController();
    uploadControllerRef.current = controller;

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

      await uploadWithProgress({
        file,
        headers: presign.requiredHeaders,
        onProgress: setUploadProgress,
        signal: controller.signal,
        url: presign.uploadUrl,
      });

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
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
        setError('Upload cancelled. No material was saved.');
        return;
      }
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The material upload failed.',
      );
    } finally {
      uploadControllerRef.current = null;
      setPendingFile('');
      setUploadProgress(0);
      setDragging(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function rename() {
    if (!renaming || !renameTitle.trim()) return;
    setRenamingPending(true);
    setError('');
    try {
      const response = await fetch(`/api/lms/materials/${renaming.id}`, {
        body: JSON.stringify({ title: renameTitle.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; material?: TeacherMaterial };
      if (!response.ok || !result.material) throw new Error(result.error ?? 'Unable to rename this material.');
      setMaterials((current) => current.map((item) => item.id === result.material!.id ? result.material! : item));
      setRenaming(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Unable to rename this material.');
    } finally {
      setRenamingPending(false);
    }
  }

  async function toggleDownloadable(material: TeacherMaterial) {
    setError('');
    try {
      const response = await fetch(`/api/lms/materials/${material.id}`, {
        body: JSON.stringify({ isDownloadable: !material.isDownloadable }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        material?: TeacherMaterial;
      };
      if (!response.ok || !result.material) {
        throw new Error(result.error ?? 'Unable to change download access.');
      }
      setMaterials((current) =>
        current.map((item) => item.id === result.material!.id ? result.material! : item),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change download access.');
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
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white p-3 shadow-sm">
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
            ? 'border-[#084B2B] bg-emerald-50'
            : 'border-emerald-300 bg-[#F8FAF7] hover:border-[#084B2B]',
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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#084B2B]">
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
            {pendingFile ? `${uploadProgress}% uploaded` : 'Secure direct upload to Cloudflare R2'}
          </span>
          {pendingFile ? <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-[#084B2B] transition-[width]" style={{ width: `${uploadProgress}%` }} /></span> : null}
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

      {pendingFile ? (
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700" onClick={() => uploadControllerRef.current?.abort()} type="button">
          <X className="size-4" /> Cancel Upload
        </button>
      ) : null}

      {materials.length ? (
        <ul className="flex min-w-0 flex-col gap-2">
          {materials.map((material) => (
            <li
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-emerald-950/10 bg-white p-3 sm:flex-row sm:items-center"
              key={material.id}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#084B2B]">
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
              <span className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-5">
                <button
                  aria-label={`Preview ${material.title}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-emerald-950/10 text-slate-500 hover:bg-[#F8FAF7] hover:text-[#084B2B]"
                  onClick={() => setPreviewing(material)}
                  type="button"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </button>
                <a
                  aria-label={`Download ${material.title}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-emerald-950/10 text-slate-500 hover:bg-[#F8FAF7] hover:text-[#084B2B]"
                  href={`/api/lms/materials/${material.id}/download`}
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>
                <button
                  aria-pressed={material.isDownloadable}
                  className={`flex min-h-9 items-center justify-center rounded-lg border px-2 text-[10px] font-black ${material.isDownloadable ? 'border-[#D4AF37] bg-[#FBF6E2] text-[#8C6B1B]' : 'border-emerald-950/10 text-slate-500'}`}
                  onClick={() => void toggleDownloadable(material)}
                  type="button"
                >
                  {material.isDownloadable ? 'Worksheet DL on' : 'No student DL'}
                </button>
                <button
                  className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-emerald-950/10 px-2 text-xs font-bold text-slate-600 hover:bg-[#F8FAF7]"
                  onClick={() => { setRenaming(material); setRenameTitle(material.title); }}
                  type="button"
                >
                  <Pencil className="size-3.5" /> Rename
                </button>
                <button
                  aria-label={`Delete ${material.title}`}
                  className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  disabled={deletingId === material.id}
                  onClick={() => void remove(material)}
                  type="button"
                >
                  {deletingId === material.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <><Trash2 className="size-3.5" aria-hidden="true" /> Delete</>
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
              <iframe className="h-[60dvh] w-full rounded-xl border border-emerald-950/10 bg-white" src={previewing.fileUrl} title={`Preview ${previewing.title}`} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">This file type opens in its native viewer.</div>
            )}
            <a className="flex items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 py-3 text-sm font-bold text-white hover:bg-[#063B22]" href={previewing.fileUrl} rel="noopener noreferrer" target="_blank"><ExternalLink className="size-4" /> Open in new tab</a>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => { if (!open) setRenaming(null); }}>
        {renaming ? (
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Rename file</DialogTitle><DialogDescription>Change the title shown to students. The R2 object key stays protected.</DialogDescription></DialogHeader>
            <label className="text-sm font-bold text-slate-700">File title<input autoFocus className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3" maxLength={200} onChange={(event) => setRenameTitle(event.target.value)} value={renameTitle} /></label>
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 font-bold text-white disabled:opacity-50" disabled={renamingPending || !renameTitle.trim()} onClick={() => void rename()} type="button">{renamingPending ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />} Save name</button>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
