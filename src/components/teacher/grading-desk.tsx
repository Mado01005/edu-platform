'use client';

import { useActionState } from 'react';
import { ExternalLink, FileCheck2, Save } from 'lucide-react';
import { gradeAssignmentSubmissionAction, type GradeActionState } from '@/app/teacher/grading/actions';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/UI/dialog';

export type GradingSubmission = {
  attachmentUrls: string[];
  assignmentTitle: string;
  courseTitle: string;
  createdAt: string;
  feedback: string | null;
  fileType: string | null;
  fileUrl: string | null;
  grade: number | null;
  id: string;
  lessonTitle: string;
  studentEmail: string;
  studentName: string | null;
  textSolution: string | null;
};

const initialState: GradeActionState = { error: null, success: false };

function GradeDialog({ submission }: { submission: GradingSubmission }) {
  const [state, action] = useActionState(gradeAssignmentSubmissionAction.bind(null, submission.id), initialState);
  return (
    <Dialog>
      <DialogTrigger asChild><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-3 py-2 text-xs font-bold text-white hover:bg-[#063B22] sm:w-auto" type="button"><FileCheck2 className="size-4" /> Review & Grade</button></DialogTrigger>
      <DialogContent className="custom-scrollbar max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{submission.assignmentTitle}</DialogTitle><DialogDescription>{submission.studentName ?? submission.studentEmail} · {submission.courseTitle} · {submission.lessonTitle}</DialogDescription></DialogHeader>
        {submission.textSolution ? <div className="whitespace-pre-wrap rounded-xl border border-emerald-950/10 bg-[#F8FAF8] p-4 text-sm leading-6 text-slate-700">{submission.textSolution}</div> : null}
        {submission.attachmentUrls.length ? (
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {submission.attachmentUrls.map((url, index) => (
              <a className="group overflow-hidden rounded-xl border border-emerald-950/10 bg-white" href={url} key={url} rel="noopener noreferrer" target="_blank">
                {submission.fileType === 'PDF' && index === 0 ? <span className="flex min-h-40 items-center justify-center gap-2 text-sm font-bold text-[#084B2B]"><ExternalLink className="size-4" /> Open PDF submission</span> : <img alt={`Notebook page ${index + 1} from ${submission.studentName ?? submission.studentEmail}`} className="max-h-72 w-full object-contain" src={url} />}
              </a>
            ))}
          </div>
        ) : null}
        <form action={action} className="flex min-w-0 flex-col gap-3">
          <label className="text-sm font-bold text-slate-700">Score (out of 10)<input className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-[#084B2B]" defaultValue={submission.grade ?? ''} max="10" min="0" name="grade" required step="0.5" type="number" /></label>
          <fieldset className="rounded-xl border border-emerald-950/10 bg-[#F8FAF8] p-3">
            <legend className="px-1 text-sm font-bold text-slate-700">Rubric</legend>
            <div className="mt-1 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              {['Method shown', 'Accurate reasoning', 'Clear presentation', 'Complete answer'].map((item) => <label className="flex items-center gap-2 text-xs font-bold text-slate-600" key={item}><input name="rubric" type="checkbox" value={item} /> {item}</label>)}
            </div>
          </fieldset>
          <label className="text-sm font-bold text-slate-700">Teacher Feedback<textarea className="mt-2 min-h-28 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-[#084B2B]" defaultValue={submission.feedback ?? ''} name="feedback" placeholder="Give the student clear, encouraging next steps." /></label>
          {state.error ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
          {state.success ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Grade saved and notification sent.</p> : null}
          <ActionSubmitButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 py-3 font-bold text-white hover:bg-[#063B22]" pendingLabel="Saving grade…"><Save className="size-4" /> Save Grade & Notify Student</ActionSubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GradingDesk({ submissions }: { submissions: GradingSubmission[] }) {
  return (
    <section className="flex w-full min-w-0 flex-col gap-3">
      {submissions.map((submission) => (
        <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center" key={submission.id}>
          <div className="min-w-0 flex-1"><p className="truncate font-black">{submission.assignmentTitle}</p><p className="mt-1 truncate text-sm text-slate-600">{submission.studentName ?? submission.studentEmail}</p><p className="mt-1 truncate text-xs text-slate-500">{submission.courseTitle} · {submission.lessonTitle} · {new Intl.DateTimeFormat('en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(submission.createdAt))}</p></div>
          <span className={`w-fit shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${submission.grade === null ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{submission.grade === null ? 'PENDING' : `${submission.grade}/10 GRADED`}</span>
          <GradeDialog submission={submission} />
        </article>
      ))}
      {!submissions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No assignment submissions are waiting for review.</div> : null}
    </section>
  );
}
