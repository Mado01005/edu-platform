'use client';

import { Copy, Download, KeyRound } from 'lucide-react';
import { useState } from 'react';

type GeneratedBatch = { batchId: string; codes: string[]; expiresAt: string | null };

export function CodeGenerator({
  courses,
  recentBatches,
}: {
  courses: Array<{ id: string; title: string }>;
  recentBatches: Array<{ batchId: string; count: number; createdAt: string; lastFour: string[]; target: string }>;
}) {
  const [targetType, setTargetType] = useState<'course' | 'grade'>('course');
  const [target, setTarget] = useState(courses[0]?.id ?? '');
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function generate() {
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/codes', {
      body: JSON.stringify({
        count,
        courseId: targetType === 'course' ? target : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        gradeLevel: targetType === 'grade' ? target : null,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = (await response.json().catch(() => ({}))) as GeneratedBatch & { error?: string };
    setSaving(false);
    if (!response.ok || !Array.isArray(result.codes)) {
      setError(result.error ?? 'Unable to generate codes.');
      return;
    }
    setBatch(result);
  }

  function exportCsv() {
    if (!batch) return;
    const csv = ['code', ...batch.codes].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wayground-codes-${batch.batchId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const gradeOptions = Array.from({ length: 12 }, (_, index) => `GRADE_${index + 1}`);
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="flex items-center gap-2 font-black"><KeyRound className="size-4 text-violet-300" /> Generate secure batch</h2>
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
          <button className={`rounded-xl border p-3 text-sm font-bold ${targetType === 'course' ? 'border-violet-300 bg-violet-300/10' : 'border-white/10 text-zinc-500'}`} onClick={() => { setTargetType('course'); setTarget(courses[0]?.id ?? ''); }} type="button">Course</button>
          <button className={`rounded-xl border p-3 text-sm font-bold ${targetType === 'grade' ? 'border-violet-300 bg-violet-300/10' : 'border-white/10 text-zinc-500'}`} onClick={() => { setTargetType('grade'); setTarget('GRADE_1'); }} type="button">Grade</button>
        </div>
        <select className="mt-3 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" onChange={(event) => setTarget(event.target.value)} value={target}>
          {(targetType === 'course' ? courses.map((course) => ({ label: course.title, value: course.id })) : gradeOptions.map((grade) => ({ label: grade.replace('_', ' '), value: grade }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
          <label className="min-w-0 text-[10px] font-bold uppercase text-zinc-500">Quantity
            <input className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white" max={100} min={1} onChange={(event) => setCount(Number(event.target.value))} type="number" value={count} />
          </label>
          <label className="min-w-0 text-[10px] font-bold uppercase text-zinc-500">Expiry (optional)
            <input className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-black px-2 py-3 text-sm text-white" onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} />
          </label>
        </div>
        {error ? <p aria-live="polite" className="mt-3 text-xs text-red-300">{error}</p> : null}
        <button className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={saving || !target} onClick={() => void generate()} type="button">{saving ? 'Generating…' : 'Generate 12-digit codes'}</button>
      </section>

      {batch ? (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Copy now — plaintext is never stored</p>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black" onClick={() => void navigator.clipboard.writeText(batch.codes.join('\n'))} type="button"><Copy className="size-3" /> Copy all</button>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black" onClick={exportCsv} type="button"><Download className="size-3" /> Export CSV</button>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl bg-black p-3 font-mono text-sm leading-7 text-emerald-200">{batch.codes.map((code) => <p key={code}>{code}</p>)}</div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <h2 className="font-black">Recent batches</h2>
        <div className="mt-3 flex flex-col gap-2">
          {recentBatches.map((item) => (
            <div className="min-w-0 rounded-xl bg-black p-3" key={item.batchId}>
              <div className="flex min-w-0 items-center justify-between gap-2"><p className="truncate text-sm font-bold">{item.target}</p><span className="shrink-0 text-xs text-zinc-500">{item.count} codes</span></div>
              <p className="mt-1 truncate text-[10px] text-zinc-600">Ends: {item.lastFour.map((value) => `••••${value}`).join(', ')}</p>
            </div>
          ))}
          {!recentBatches.length ? <p className="text-sm text-zinc-500">No code batches yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
