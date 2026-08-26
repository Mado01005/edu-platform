'use client';

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

export type EditableExamQuestion = {
  correctOptionKey: string;
  diagramUrl: string | null;
  id: string;
  options: { key: string; text: string }[];
  prompt: string;
  workedSolution: string;
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function emptyQuestion(): EditableExamQuestion {
  return {
    correctOptionKey: 'A',
    diagramUrl: null,
    id: crypto.randomUUID(),
    options: OPTION_KEYS.map((key) => ({ key, text: '' })),
    prompt: '',
    workedSolution: '',
  };
}

export function ExamQuestionBuilder({
  assignmentId,
  initialQuestions,
}: {
  assignmentId: string;
  initialQuestions: EditableExamQuestion[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateQuestion(index: number, patch: Partial<EditableExamQuestion>) {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  }

  async function save() {
    if (pending) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/lms/exams/${assignmentId}/questions`, {
        body: JSON.stringify({ questions: questions.map(({ id: _id, ...question }) => question) }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      const result = await response.json() as { count?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to save questions.');
      setMessage(`${result.count ?? questions.length} exam questions saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save questions.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border-t border-emerald-950/10 bg-[#F8FAF8] p-3">
      <div className="flex min-w-0 items-center justify-between gap-3"><div><h3 className="text-sm font-black">MCQ &amp; LaTeX question bank</h3><p className="mt-1 text-xs text-slate-500">Use $...$ for inline math and $$...$$ for display math.</p></div><button className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-[#084B2B] px-3 text-xs font-black text-[#084B2B]" onClick={() => setQuestions((current) => [...current, emptyQuestion()])} type="button"><Plus className="size-3.5" /> Question</button></div>
      <div className="mt-3 flex min-w-0 flex-col gap-3">
        {questions.map((question, index) => (
          <article className="rounded-xl border border-emerald-950/10 bg-white p-3" key={question.id}>
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-black text-[#084B2B]">Question {index + 1}</p><button aria-label={`Delete question ${index + 1}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Trash2 className="size-4" /></button></div>
            <label className="mt-2 block text-xs font-bold text-slate-600">Prompt<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm" onChange={(event) => updateQuestion(index, { prompt: event.target.value })} value={question.prompt} /></label>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label className="text-xs font-bold text-slate-600" key={option.key}>{option.key}<input className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={(event) => updateQuestion(index, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, text: event.target.value } : item) })} value={option.text} /></label>)}</div>
            <label className="mt-2 block text-xs font-bold text-slate-600">Correct answer<select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" onChange={(event) => updateQuestion(index, { correctOptionKey: event.target.value })} value={question.correctOptionKey}>{question.options.map((option) => <option key={option.key} value={option.key}>{option.key}</option>)}</select></label>
            <label className="mt-2 block text-xs font-bold text-slate-600">Worked solution<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm" onChange={(event) => updateQuestion(index, { workedSolution: event.target.value })} value={question.workedSolution} /></label>
            <label className="mt-2 block text-xs font-bold text-slate-600">Diagram URL (optional)<input className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" onChange={(event) => updateQuestion(index, { diagramUrl: event.target.value || null })} type="url" value={question.diagramUrl ?? ''} /></label>
          </article>
        ))}
        {!questions.length ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">Add the first MCQ to enable this exam.</p> : null}
      </div>
      <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-black text-white disabled:opacity-50" disabled={pending || !questions.length} onClick={() => void save()} type="button">{pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save question bank</button>
      {message ? <p aria-live="polite" className="mt-2 text-xs font-bold text-emerald-700">{message}</p> : null}
      {error ? <p aria-live="polite" className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
    </section>
  );
}
