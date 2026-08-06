'use client';

import { useActionState } from 'react';
import { ExternalLink, FileCheck2, Save } from 'lucide-react';
import { gradeAssignmentSubmissionAction, type GradeActionState } from '@/app/teacher/grading/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/UI/dialog';

export type GradingSubmission = {
  assignmentTitle: string;
  courseTitle: string;
  createdAt: string;
  feedback: string | null;
  fileType: string;
  fileUrl: string;
  grade: number | null;
  id: string;
  lessonTitle: string;
  studentEmail: string;
  studentName: string | null;
};

const initialState: GradeActionState = { error: null, success: false };

function GradeDialog({ submission }: { submission: GradingSubmission }) {
  const [state, action] = useActionState(gradeAssignmentSubmissionAction.bind(null, submission.id), initialState);
  return (
    <Dialog>
      <DialogTrigger asChild><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-3 py-2 text-xs font-black text-black sm:w-auto" type="button"><FileCheck2 className="size-4" /> Review & Grade</button></DialogTrigger>
      <DialogContent className="custom-scrollbar max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{submission.assignmentTitle}</DialogTitle><DialogDescription>{submission.studentName ?? submission.studentEmail} · {submission.courseTitle} · {submission.lessonTitle}</DialogDescription></DialogHeader>
        {submission.fileType === 'PDF' ? <iframe className="h-72 w-full rounded-xl border border-white/10 bg-white" src={submission.fileUrl} title={`Submission from ${submission.studentName ?? submission.studentEmail}`} /> : <img alt={`Submission from ${submission.studentName ?? submission.studentEmail}`} className="max-h-72 w-full rounded-xl border border-white/10 object-contain" src={submission.fileUrl} />}
        <a className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold" href={submission.fileUrl} rel="noopener noreferrer" target="_blank"><ExternalLink className="size-4" /> Open original file</a>
        <form action={action} className="flex min-w-0 flex-col gap-3">
          <label className="text-sm font-bold text-zinc-300">Grade (0–100)<input className="mt-2 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={submission.grade ?? ''} max="100" min="0" name="grade" required step="0.01" type="number" /></label>
          <label className="text-sm font-bold text-zinc-300">Teacher Feedback<textarea className="mt-2 min-h-28 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-black px-3 py-3 text-white" defaultValue={submission.feedback ?? ''} name="feedback" placeholder="Give the student clear, encouraging next steps." /></label>
          {state.error ? <p aria-live="polite" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p> : null}
          {state.success ? <p aria-live="polite" className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">Grade saved and notification sent.</p> : null}
          <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 font-black text-black" pendingLabel="Saving grade…"><Save className="size-4" /> Save Grade & Notify Student</ActionSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GradingDesk({ submissions }: { submissions: GradingSubmission[] }) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-3">
      {submissions.map((submission) => (
        <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:flex-row sm:items-center" key={submission.id}>
          <div className="min-w-0 flex-1"><p className="truncate font-black">{submission.assignmentTitle}</p><p className="mt-1 truncate text-sm text-zinc-400">{submission.studentName ?? submission.studentEmail}</p><p className="mt-1 truncate text-xs text-zinc-600">{submission.courseTitle} · {submission.lessonTitle} · {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(submission.createdAt))}</p></div>
          <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${submission.grade === null ? 'bg-amber-300/10 text-amber-200' : 'bg-emerald-300/10 text-emerald-200'}`}>{submission.grade === null ? 'PENDING' : `${submission.grade}% GRADED`}</span>
          <GradeDialog submission={submission} />
        </article>
      ))}
      {!submissions.length ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No assignment submissions are waiting for review.</div> : null}
    </section>
  );
}
