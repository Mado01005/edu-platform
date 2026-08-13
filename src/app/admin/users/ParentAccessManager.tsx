'use client';

import { Link2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Option = { id: string; label: string };
type LinkRecord = { parentId: string; parentName: string; studentId: string; studentName: string };

export function ParentAccessManager({ links, parents, students }: { links: LinkRecord[]; parents: Option[]; students: Option[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');

  async function configure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('save');
    setMessage('');
    const response = await fetch('/api/admin/parents/access', {
      body: JSON.stringify({ parentId, pin, studentId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending('');
    setMessage(response.ok ? 'Parent link and PIN saved. Existing parent sessions were revoked.' : result.error ?? 'Unable to save parent access.');
    if (response.ok) { setPin(''); router.refresh(); }
  }

  async function remove(link: LinkRecord) {
    setPending(`${link.parentId}:${link.studentId}`);
    const response = await fetch('/api/admin/parents/access', {
      body: JSON.stringify({ parentId: link.parentId, studentId: link.studentId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    });
    setPending('');
    if (response.ok) router.refresh();
    else setMessage('Unable to remove parent link.');
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><ShieldCheck className="size-5" /></span>
      <h2 className="mt-3 text-xl font-black text-slate-900">MPS+ parent access</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Link a parent to a student and issue or reset the parent&apos;s 4-digit PIN.</p>
      <form className="mt-4 flex min-w-0 flex-col gap-2" onSubmit={configure}>
        <select className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" onChange={(event) => setParentId(event.target.value)} required value={parentId}><option value="">Select parent</option>{parents.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
        <select className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" onChange={(event) => setStudentId(event.target.value)} required value={studentId}><option value="">Select student</option>{students.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
        <input aria-label="4-digit parent PIN" className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" inputMode="numeric" maxLength={4} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4-digit PIN" required value={pin} />
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={pending === 'save' || pin.length !== 4} type="submit">{pending === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Link and issue PIN</button>
      </form>
      {message ? <p aria-live="polite" className="mt-3 text-xs text-slate-700">{message}</p> : null}
      <div className="mt-4 flex flex-col gap-2">{links.map((link) => <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3" key={`${link.parentId}:${link.studentId}`}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{link.parentName}</span><span className="block truncate text-xs text-slate-600">Student: {link.studentName}</span></span><button aria-label="Remove parent link" className="rounded-lg border border-red-200 bg-white p-2 text-red-700" disabled={Boolean(pending)} onClick={() => void remove(link)} type="button"><Trash2 className="size-4" /></button></div>)}</div>
    </section>
  );
}
