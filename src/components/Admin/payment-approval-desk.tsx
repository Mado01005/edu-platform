'use client';

import { Check, ExternalLink, Loader2, ReceiptText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/UI/dialog';

export type ApprovalPayment = {
  amount: string;
  courseTitle: string;
  currency: string;
  id: string;
  method: string;
  moduleTitle: string | null;
  phone: string | null;
  studentName: string;
};

export function PaymentApprovalDesk({ payments }: { payments: ApprovalPayment[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ApprovalPayment | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function review(payment: ApprovalPayment, decision: 'approve' | 'reject') {
    if (pending) return;
    const reason = decision === 'reject'
      ? window.prompt('Rejection note shown to the student:')?.trim()
      : null;
    if (decision === 'reject' && !reason) return;
    setPending(`${payment.id}:${decision}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/accounting/online-payments/${payment.id}/${decision}`, {
        ...(reason ? { body: JSON.stringify({ reason }), headers: { 'Content-Type': 'application/json' } } : {}),
        method: 'POST',
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Payment review failed.');
      setNotice(decision === 'approve'
        ? 'Approved. Access is active and student/parent WhatsApp dispatch was attempted.'
        : 'Rejected with the supplied note.');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Payment review failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {notice ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p> : null}
      {error ? <p aria-live="assertive" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {payments.map((payment) => {
        const busy = pending?.startsWith(`${payment.id}:`) ?? false;
        return (
          <article className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" key={payment.id}>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-900">{payment.studentName}</p>
              <p className="mt-1 break-words text-sm text-slate-600">{payment.phone ?? 'No student phone'} · {payment.moduleTitle ? `${payment.courseTitle} / ${payment.moduleTitle}` : payment.courseTitle}</p>
              <p className="mt-2 text-sm font-black text-[#084B2B]">{payment.amount} {payment.currency} · {payment.method.replaceAll('_', ' ')}</p>
            </div>
            <div className="grid min-w-0 grid-cols-3 gap-2">
              <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-950/10 px-3 text-xs font-black text-slate-700 hover:bg-[#F8FAF8]" onClick={() => setPreview(payment)} type="button"><ReceiptText className="size-4" /> Receipt</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#084B2B] px-3 text-xs font-black text-white hover:bg-[#0F6E41] disabled:opacity-50" disabled={busy} onClick={() => void review(payment, 'approve')} type="button">{pending === `${payment.id}:approve` ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve</button>
              <button className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-red-200 px-3 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => void review(payment, 'reject')} type="button">{pending === `${payment.id}:reject` ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Reject</button>
            </div>
          </article>
        );
      })}
      {!payments.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No pending transfer receipts.</div> : null}
      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        {preview ? <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{preview.studentName} receipt</DialogTitle><DialogDescription>Full-resolution private transfer proof</DialogDescription></DialogHeader><a href={`/api/accounting/online-payments/${preview.id}/receipt`} rel="noopener noreferrer" target="_blank"><img alt={`Payment receipt from ${preview.studentName}`} className="max-h-[72dvh] w-full rounded-xl border border-emerald-950/10 object-contain" src={`/api/accounting/online-payments/${preview.id}/receipt`} /></a><a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-black text-white" href={`/api/accounting/online-payments/${preview.id}/receipt`} rel="noopener noreferrer" target="_blank"><ExternalLink className="size-4" /> Open full resolution</a></DialogContent> : null}
      </Dialog>
    </section>
  );
}
