'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { ASSIGNMENT_SUBMISSION_ACCEPT, MAX_ASSIGNMENT_SUBMISSION_BYTES } from '@/lib/lms/submission-types';

type Submission = { feedback: string | null; fileUrl: string; grade: number | null; status: 'SUBMITTED' | 'GRADED' } | null;

export function AssignmentSubmissionCard({ assignmentId, dueAt, initialSubmission, instructions }: { assignmentId: string; dueAt: string | null; initialSubmission: Submission; instructions: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [submission, setSubmission] = useState(initialSubmission);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError(''); setPending(true);
    try {
      if (!file.size || file.size > MAX_ASSIGNMENT_SUBMISSION_BYTES) throw new Error('Choose a PDF, JPG, or PNG up to 25 MB.');
      const preparedResponse = await fetch(`/api/lms/assignments/${assignmentId}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: file.type, fileName: file.name, size: file.size }) });
      const prepared = await preparedResponse.json() as { error?: string; fileType?: string; key?: string; requiredHeaders?: Record<string, string>; uploadUrl?: string };
      if (!preparedResponse.ok || !prepared.uploadUrl || !prepared.key || !prepared.fileType) throw new Error(prepared.error ?? 'Unable to prepare the upload.');
      const uploaded = await fetch(prepared.uploadUrl, { method: 'PUT', headers: prepared.requiredHeaders, body: file });
      if (!uploaded.ok) throw new Error('Cloudflare R2 rejected the upload.');
      const savedResponse = await fetch(`/api/lms/assignments/${assignmentId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileType: prepared.fileType, objectKey: prepared.key }) });
      const saved = await savedResponse.json() as { error?: string; submission?: Submission };
      if (!savedResponse.ok || !saved.submission) throw new Error(saved.error ?? 'Unable to submit the assignment.');
      setSubmission(saved.submission);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.'); }
    finally { setPending(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-[#D4AF37]/40 bg-[#FDF8E8] p-4 text-slate-900">
      <h2 className="font-black">Assignment submission</h2>
      {instructions ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{instructions}</p> : null}
      {dueAt ? <p className="mt-2 text-xs text-[#8C6B1B]">Due {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(dueAt))} Cairo time</p> : null}
      {submission ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="size-4" /> {submission.status === 'GRADED' ? `Graded: ${submission.grade ?? '—'}%` : 'Submitted for grading'}</p>{submission.feedback ? <p className="mt-2 text-slate-700">Teacher feedback: {submission.feedback}</p> : null}<a className="mt-2 inline-block text-xs font-bold text-[#084B2B]" href={submission.fileUrl} rel="noopener noreferrer" target="_blank">View submitted file</a></div> : null}
      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-4 py-4 text-sm font-black text-[#084B2B] transition hover:border-[#084B2B] hover:bg-emerald-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{pending ? 'Uploading…' : submission ? 'Replace submission' : 'Upload solution'}<input ref={inputRef} accept={ASSIGNMENT_SUBMISSION_ACCEPT} className="sr-only" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} type="file" /></label>
      {error ? <p aria-live="polite" className="mt-2 text-xs text-red-700">{error}</p> : null}
    </section>
  );
}
