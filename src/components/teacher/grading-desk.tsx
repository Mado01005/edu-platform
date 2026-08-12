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
      <DialogTrigger asChild><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 sm:w-auto" type="button"><FileCheck2 className="size-4" /> Review & Grade</button></DialogTrigger>
      <DialogContent className="custom-scrollbar max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{submission.assignmentTitle}</DialogTitle><DialogDescription>{submission.studentName ?? submission.studentEmail} · {submission.courseTitle} · {submission.lessonTitle}</DialogDescription></DialogHeader>
        {submission.fileType === 'PDF' ? <iframe className="h-72 w-full rounded-xl border border-slate-200 bg-white" src={submission.fileUrl} title={`Submission from ${submission.studentName ?? submission.studentEmail}`} /> : <img alt={`Submission from ${submission.studentName ?? submission.studentEmail}`} className="max-h-72 w-full rounded-xl border border-slate-200 object-contain" src={submission.fileUrl} />}
        <a className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" href={submission.fileUrl} rel="noopener noreferrer" target="_blank"><ExternalLink className="size-4" /> Open original file</a>
        <form action={action} className="flex min-w-0 flex-col gap-3">
          <label className="text-sm font-bold text-slate-700">Grade (0–100)<input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500" defaultValue={submission.grade ?? ''} max="100" min="0" name="grade" required step="0.01" type="number" /></label>
          <label className="text-sm font-bold text-slate-700">Teacher Feedback<textarea className="mt-2 min-h-28 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-sky-500" defaultValue={submission.feedback ?? ''} name="feedback" placeholder="Give the student clear, encouraging next steps." /></label>
          {state.error ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
          {state.success ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Grade saved and notification sent.</p> : null}
          <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700" pendingLabel="Saving grade…"><Save className="size-4" /> Save Grade & Notify Student</ActionSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GradingDesk({ submissions }: { submissions: GradingSubmission[] }) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-3">
      {submissions.map((submission) => (
        <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center" key={submission.id}>
          <div className="min-w-0 flex-1"><p className="truncate font-black">{submission.assignmentTitle}</p><p className="mt-1 truncate text-sm text-slate-600">{submission.studentName ?? submission.studentEmail}</p><p className="mt-1 truncate text-xs text-slate-500">{submission.courseTitle} · {submission.lessonTitle} · {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(submission.createdAt))}</p></div>
          <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${submission.grade === null ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{submission.grade === null ? 'PENDING' : `${submission.grade}% GRADED`}</span>
          <GradeDialog submission={submission} />
        </article>
      ))}
      {!submissions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No assignment submissions are waiting for review.</div> : null}
    </section>
  );
}
