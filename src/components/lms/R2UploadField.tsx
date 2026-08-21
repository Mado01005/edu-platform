'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react';

type R2UploadFieldProps = {
  accept: 'video' | 'pdf';
  label: string;
  lessonId?: string;
  name: string;
  initialUrl?: string | null;
};

type PresignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  requiredHeaders?: Record<string, string>;
  error?: string;
};

export function R2UploadField({
  accept,
  label,
  lessonId,
  name,
  initialUrl,
}: R2UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl ?? '');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function upload(file: File) {
    setPending(true);
    setError('');
    setFileName(file.name);

    try {
      const presignRequest = await fetch('/api/storage/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          lessonId,
        }),
      });
      const presign = (await presignRequest.json()) as PresignResponse;

      if (!presignRequest.ok || !presign.uploadUrl || !presign.publicUrl) {
        throw new Error(presign.error ?? 'Unable to prepare the upload.');
      }

      const uploadRequest = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: presign.requiredHeaders,
        body: file,
      });

      if (!uploadRequest.ok) {
        throw new Error(
          'R2 rejected the upload. Check the bucket CORS configuration.',
        );
      }

      setUrl(presign.publicUrl);
    } catch (uploadError) {
      setUrl('');
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The upload failed.',
      );
    } finally {
      setPending(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <input name={name} type="hidden" value={url} />
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-[#F8FAF7] p-4 transition hover:border-emerald-400">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#084B2B]">
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : url ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <FileUp className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">
            {pending
              ? `Uploading ${fileName}…`
              : url
                ? fileName || 'Upload complete'
                : `Choose a ${accept === 'pdf' ? 'PDF' : 'video'}`}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {accept === 'pdf' ? 'PDF only · up to 50 MiB' : 'MP4 only · up to 500 MiB'}
          </span>
        </span>
        <input
          ref={inputRef}
          accept={accept === 'pdf' ? 'application/pdf,.pdf' : 'video/mp4,.mp4'}
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          type="file"
        />
      </label>

      {url ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <span className="min-w-0 flex-1 truncate">{url}</span>
          <button
            aria-label="Remove uploaded file"
            className="shrink-0 rounded p-1 hover:bg-emerald-100"
            onClick={() => {
              setUrl('');
              setFileName('');
            }}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
