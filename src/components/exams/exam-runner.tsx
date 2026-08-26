'use client';

import { CheckCircle2, Clock3, Loader2, RotateCcw, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MathText } from '@/components/exams/math-text';

type ExamOption = { key: string; text: string };
type AttemptQuestion = {
  diagramUrl: string | null;
  id: string;
  options: ExamOption[];
  prompt: string;
};
type Attempt = {
  attemptId: string;
  attemptNumber: number;
  deadline: string;
  questions: AttemptQuestion[];
};
type ReviewQuestion = AttemptQuestion & {
  correctOptionKey: string;
  selectedOptionKey: string | null;
  workedSolution: string;
};
type Result = {
  attemptNumber: number;
  highestScore: number;
  review: ReviewQuestion[];
  score: number;
};

function timeLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ExamRunner({
  assignmentId,
  attemptsUsed,
  durationMin,
  highestScore,
  maxAttempts,
  title,
}: {
  assignmentId: string;
  attemptsUsed: number;
  durationMin: number;
  highestScore: number | null;
  maxAttempts: number;
  title: string;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submissionStarted = useRef(false);

  const remaining = attempt && now
    ? new Date(attempt.deadline).getTime() - now
    : durationMin * 60_000;
  const answeredCount = Object.keys(answers).length;
  const remainingAttempts = Math.max(0, maxAttempts - attemptsUsed - (result ? 1 : 0));

  useEffect(() => {
    if (!attempt || result) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [attempt, result]);

  async function start() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/lms/exams/${assignmentId}/attempt`, { method: 'POST' });
      const body = await response.json() as Attempt & { error?: string };
      if (!response.ok || !body.attemptId) throw new Error(body.error ?? 'Unable to start the exam.');
      submissionStarted.current = false;
      setAnswers({});
      setResult(null);
      setAttempt(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start the exam.');
    } finally {
      setPending(false);
    }
  }

  const submit = useCallback(async () => {
    if (!attempt || pending || submissionStarted.current) return;
    submissionStarted.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/lms/exams/${assignmentId}/attempt`, {
        body: JSON.stringify({ answers, attemptId: attempt.attemptId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const body = await response.json() as Result & { error?: string };
      if (!response.ok || !Array.isArray(body.review)) throw new Error(body.error ?? 'Unable to submit the exam.');
      setResult(body);
    } catch (caught) {
      submissionStarted.current = false;
      setError(caught instanceof Error ? caught.message : 'Unable to submit the exam.');
    } finally {
      setPending(false);
    }
  }, [answers, assignmentId, attempt, pending]);

  useEffect(() => {
    if (attempt && !result && now > 0 && remaining <= 0) void submit();
  }, [attempt, now, remaining, result, submit]);

  const scoreSummary = useMemo(
    () => result ? `${result.score.toFixed(1)}% · Highest ${result.highestScore.toFixed(1)}%` : null,
    [result],
  );

  return (
    <section className="min-w-0 rounded-2xl border border-[#D4AF37]/40 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6B1B]">Timed LaTeX exam</p>
          <h2 className="mt-1 break-words text-xl font-black text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{durationMin} minutes · {maxAttempts} attempts · highest score recorded</p>
        </div>
        {attempt && !result ? <span className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 font-mono text-sm font-black ${remaining < 60_000 ? 'bg-red-100 text-red-700' : 'bg-[#FBF6E2] text-[#8C6B1B]'}`}><Clock3 className="size-4" /> {timeLabel(remaining)}</span> : null}
      </header>

      {!attempt ? (
        <div className="mt-4 rounded-xl border border-emerald-950/10 bg-[#F8FAF8] p-4 text-sm text-slate-600">
          <p>{highestScore === null ? 'No attempt submitted yet.' : `Current highest score: ${highestScore.toFixed(1)}%.`}</p>
          <p className="mt-1">Attempts used: {attemptsUsed} / {maxAttempts}</p>
          <button className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 font-black text-white hover:bg-[#0F6E41] disabled:opacity-50" disabled={pending || attemptsUsed >= maxAttempts} onClick={() => void start()} type="button">{pending ? <Loader2 className="size-4 animate-spin" /> : <Clock3 className="size-4" />} Start exam</button>
        </div>
      ) : null}

      {attempt && !result ? (
        <div className="mt-5 flex min-w-0 flex-col gap-4">
          {attempt.questions.map((question, questionIndex) => (
            <article className="min-w-0 rounded-2xl border border-emerald-950/10 bg-[#F8FAF8] p-4" key={question.id}>
              <p className="text-xs font-black uppercase tracking-wide text-[#084B2B]">Question {questionIndex + 1} of {attempt.questions.length}</p>
              <MathText className="mt-3 block whitespace-pre-wrap text-base font-bold leading-7 text-slate-900" value={question.prompt} />
              {question.diagramUrl ? <img alt={`Diagram for question ${questionIndex + 1}`} className="mt-3 max-h-80 w-full rounded-xl border border-emerald-950/10 object-contain" src={question.diagramUrl} /> : null}
              <fieldset className="mt-4 flex min-w-0 flex-col gap-2">
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option) => (
                  <label className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${answers[question.id] === option.key ? 'border-[#D4AF37] bg-[#FBF6E2]' : 'border-emerald-950/10 bg-white hover:border-emerald-300'}`} key={option.key}>
                    <input checked={answers[question.id] === option.key} className="mt-1" name={`question-${question.id}`} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.key }))} type="radio" />
                    <MathText className="min-w-0 flex-1 leading-6" value={option.text} />
                  </label>
                ))}
              </fieldset>
            </article>
          ))}
          <button className="sticky bottom-20 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 font-black text-white shadow-lg hover:bg-[#0F6E41] disabled:opacity-50 md:bottom-4" disabled={pending} onClick={() => void submit()} type="button">{pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit exam · {answeredCount}/{attempt.questions.length} answered</button>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-2 text-xl font-black text-emerald-900">{scoreSummary}</p><p className="mt-1 text-xs text-emerald-700">Attempt {result.attemptNumber} submitted. Worked solutions are available below.</p></div>
          <div className="mt-4 flex min-w-0 flex-col gap-3">
            {result.review.map((question, index) => (
              <article className="rounded-xl border border-emerald-950/10 bg-[#F8FAF8] p-4" key={question.id}>
                <p className="text-xs font-black text-[#084B2B]">Question {index + 1}</p>
                <MathText className="mt-2 block font-bold" value={question.prompt} />
                <p className={`mt-3 text-sm font-black ${question.selectedOptionKey === question.correctOptionKey ? 'text-emerald-700' : 'text-red-700'}`}>Your answer: {question.selectedOptionKey ?? 'Not answered'} · Correct: {question.correctOptionKey}</p>
                <div className="mt-3 rounded-xl border border-[#D4AF37]/40 bg-[#FBF6E2] p-3"><p className="text-xs font-black uppercase tracking-wide text-[#8C6B1B]">Worked solution</p><MathText className="mt-2 block whitespace-pre-wrap text-sm leading-6 text-slate-700" value={question.workedSolution} /></div>
              </article>
            ))}
          </div>
          {remainingAttempts > 0 ? <button className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#084B2B] px-4 font-black text-[#084B2B] hover:bg-emerald-50" onClick={() => { setAttempt(null); setResult(null); }} type="button"><RotateCcw className="size-4" /> Start retake · {remainingAttempts} remaining</button> : null}
        </div>
      ) : null}
      {error ? <p aria-live="polite" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    </section>
  );
}
