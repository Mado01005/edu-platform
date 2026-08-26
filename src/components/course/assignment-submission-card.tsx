'use client';

import { useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, FileText, Loader2, Send, UploadCloud, X } from 'lucide-react';
import { ASSIGNMENT_SUBMISSION_ACCEPT, MAX_ASSIGNMENT_SUBMISSION_BYTES } from '@/lib/lms/submission-types';

type Submission = {
  attachmentUrls?: unknown;
  feedback: string | null;
  fileUrl: string | null;
  grade: number | null;
  status: 'SUBMITTED' | 'GRADED';
  textSolution?: string | null;
} | null;

type UploadedFile = { fileType: 'PDF' | 'JPG' | 'PNG'; objectKey: string };

async function compressNotebookImage(file: File) {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const maximumEdge = 2_000;
  const scale = Math.min(1, maximumEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.82),
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    lastModified: file.lastModified,
    type: 'image/jpeg',
  });
}

function submissionUrls(submission: Submission) {
  if (!submission) return [];
  const urls = Array.isArray(submission.attachmentUrls)
    ? submission.attachmentUrls.filter((value): value is string => typeof value === 'string')
    : [];
  if (!urls.length && submission.fileUrl) urls.push(submission.fileUrl);
  return [...new Set(urls)];
}

export function AssignmentSubmissionCard({
  assignmentId,
  dueAt,
  initialSubmission,
  instructions,
}: {
  assignmentId: string;
  dueAt: string | null;
  initialSubmission: Submission;
  instructions: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [submission, setSubmission] = useState(initialSubmission);
  const [files, setFiles] = useState<File[]>([]);
  const [textSolution, setTextSolution] = useState(initialSubmission?.textSolution ?? '');
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const urls = useMemo(() => submissionUrls(submission), [submission]);

  function chooseFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, 8);
    setFiles(next);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function uploadOne(file: File): Promise<UploadedFile> {
    const preparedFile = await compressNotebookImage(file);
    if (!preparedFile.size || preparedFile.size > MAX_ASSIGNMENT_SUBMISSION_BYTES) {
      throw new Error(`${file.name} must be 25 MB or smaller.`);
    }
    const preparedResponse = await fetch(`/api/lms/assignments/${assignmentId}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: preparedFile.type,
        fileName: preparedFile.name,
        size: preparedFile.size,
      }),
    });
    const prepared = await preparedResponse.json() as {
      error?: string;
      fileType?: UploadedFile['fileType'];
      key?: string;
      requiredHeaders?: Record<string, string>;
      uploadUrl?: string;
    };
    if (!preparedResponse.ok || !prepared.uploadUrl || !prepared.key || !prepared.fileType) {
      throw new Error(prepared.error ?? 'Unable to prepare an upload.');
    }
    const uploaded = await fetch(prepared.uploadUrl, {
      method: 'PUT',
      headers: prepared.requiredHeaders,
      body: preparedFile,
    });
    if (!uploaded.ok) throw new Error(`Upload failed for ${file.name}.`);
    return { fileType: prepared.fileType, objectKey: prepared.key };
  }

  async function submit() {
    if (pending) return;
    if (!files.length && !textSolution.trim()) {
      setError('Add notebook photos, a PDF, or a written solution.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(`Compressing and uploading ${index + 1} of ${files.length}…`);
        uploaded.push(await uploadOne(file));
      }
      setProgress('Saving submission…');
      const savedResponse = await fetch(`/api/lms/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: uploaded, textSolution: textSolution.trim() }),
      });
      const saved = await savedResponse.json() as { error?: string; submission?: Submission };
      if (!savedResponse.ok || !saved.submission) {
        throw new Error(saved.error ?? 'Unable to submit the assignment.');
      }
      setSubmission(saved.submission);
      setFiles([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Submission failed.');
    } finally {
      setPending(false);
      setProgress('');
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[#D4AF37]/40 bg-[#FBF6E2] p-4 text-slate-900">
      <h2 className="font-black">Homework submission desk</h2>
      {instructions ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{instructions}</p> : null}
      {dueAt ? <p className="mt-2 text-xs text-[#8C6B1B]">Due {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(dueAt))} Cairo time</p> : null}

      {submission ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="size-4" /> {submission.status === 'GRADED' ? `Graded: ${submission.grade ?? '—'} / 10` : 'Submitted for grading'}</p>
          {submission.feedback ? <p className="mt-2 text-slate-700">Teacher feedback: {submission.feedback}</p> : null}
          {urls.length ? <div className="mt-2 flex flex-wrap gap-2">{urls.map((url, index) => <a className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-bold text-[#084B2B]" href={url} key={url} rel="noopener noreferrer" target="_blank">Attachment {index + 1}</a>)}</div> : null}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-4 py-4 text-center text-sm font-black text-[#084B2B] hover:border-[#084B2B] hover:bg-emerald-50">
          <Camera className="size-5" /> Photograph notebook pages
          <span className="text-[10px] font-medium text-slate-500">Up to 8 images · compressed before upload</span>
          <input ref={inputRef} accept={ASSIGNMENT_SUBMISSION_ACCEPT} capture="environment" className="sr-only" disabled={pending} multiple onChange={(event) => chooseFiles(event.target.files)} type="file" />
        </label>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-4 py-4 text-center text-sm font-black text-[#084B2B] hover:border-[#084B2B] hover:bg-emerald-50">
          <UploadCloud className="size-5" /> Choose images or PDF
          <span className="text-[10px] font-medium text-slate-500">JPG, PNG, or PDF</span>
          <input accept={ASSIGNMENT_SUBMISSION_ACCEPT} className="sr-only" disabled={pending} multiple onChange={(event) => chooseFiles(event.target.files)} type="file" />
        </label>
      </div>

      {files.length ? (
        <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {files.map((file, index) => (
            <li className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-950/10 bg-white p-2 text-xs" key={`${file.name}-${file.lastModified}`}>
              <FileText className="size-4 shrink-0 text-[#084B2B]" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button aria-label={`Remove ${file.name}`} className="rounded-md p-1 text-slate-500 hover:bg-red-50 hover:text-red-600" disabled={pending} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="mt-3 block text-xs font-bold text-slate-700">Written solution (optional)
        <textarea className="mt-2 min-h-32 w-full min-w-0 resize-y rounded-xl border border-emerald-950/10 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" disabled={pending} maxLength={20_000} onChange={(event) => setTextSolution(event.target.value)} placeholder="Type your reasoning or final answer here…" value={textSolution} />
      </label>
      <button className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-black text-white hover:bg-[#0F6E41] disabled:opacity-50" disabled={pending || (!files.length && !textSolution.trim())} onClick={() => void submit()} type="button">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? progress || 'Submitting…' : submission ? 'Replace submission' : 'Submit homework'}
      </button>
      {error ? <p aria-live="polite" className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
    </section>
  );
}
