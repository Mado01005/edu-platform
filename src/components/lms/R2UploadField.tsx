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
      const presignRequest = await fetch('/api/upload/r2', {
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
      <span className="text-sm font-bold text-zinc-200">{label}</span>

      <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-black/40 p-4 transition hover:border-violet-400/60">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
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
          <span className="mt-1 block text-xs text-zinc-500">
            Direct to Cloudflare R2 · maximum 2 GB
          </span>
        </span>
        <input
          ref={inputRef}
          accept={accept === 'pdf' ? 'application/pdf' : 'video/mp4,video/webm,video/quicktime'}
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
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <span className="min-w-0 flex-1 truncate">{url}</span>
          <button
            aria-label="Remove uploaded file"
            className="shrink-0 rounded p-1 hover:bg-white/10"
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

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
