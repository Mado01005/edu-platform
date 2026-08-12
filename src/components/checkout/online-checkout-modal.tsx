'use client';

import { CheckCircle2, Copy, Upload, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export type CheckoutChannel = {
  accountValue: string;
  currency: 'EGP' | 'USD';
  displayName: string;
  instructions: string | null;
  method: 'INSTAPAY' | 'VODAFONE_CASH' | 'ONLINE_CARD' | 'USD_WIRE' | 'PAYPAL';
};

export function OnlineCheckoutModal({
  channels,
  course,
  onClose,
}: {
  channels: CheckoutChannel[];
  course: { id: string; priceEGP: string; priceUSD: string; title: string };
  onClose: () => void;
}) {
  const available = useMemo(
    () =>
      channels.filter((channel) =>
        channel.currency === 'EGP'
          ? Number(course.priceEGP) > 0
          : Number(course.priceUSD) > 0,
      ),
    [channels, course.priceEGP, course.priceUSD],
  );
  const [method, setMethod] = useState(available[0]?.method ?? 'INSTAPAY');
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');
  const selected = available.find((channel) => channel.method === method) ?? available[0];

  async function submit() {
    if (!selected || !file) {
      setError('Choose a payment method and receipt screenshot.');
      return;
    }
    setError('');
    setStatus('saving');
    try {
      const prepareResponse = await fetch('/api/checkout/upload', {
        body: JSON.stringify({
          contentType: file.type,
          courseId: course.id,
          fileName: file.name,
          fileSize: file.size,
          method: selected.method,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const prepared = (await prepareResponse.json().catch(() => ({}))) as {
        contentType?: string;
        error?: string;
        key?: string;
        uploadUrl?: string;
      };
      if (!prepareResponse.ok || !prepared.uploadUrl || !prepared.key || !prepared.contentType) {
        throw new Error(prepared.error ?? 'Unable to prepare upload.');
      }
      const uploadResponse = await fetch(prepared.uploadUrl, {
        body: file,
        headers: { 'Content-Type': prepared.contentType },
        method: 'PUT',
      });
      if (!uploadResponse.ok) throw new Error('Receipt upload failed. Please try again.');

      const submitResponse = await fetch('/api/checkout', {
        body: JSON.stringify({
          courseId: course.id,
          method: selected.method,
          receiptContentType: prepared.contentType,
          receiptObjectKey: prepared.key,
          transactionReference: reference,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await submitResponse.json().catch(() => ({}))) as { error?: string };
      if (!submitResponse.ok) throw new Error(result.error ?? 'Payment could not be submitted.');
      setStatus('done');
    } catch (caught) {
      setStatus('idle');
      setError(caught instanceof Error ? caught.message : 'Payment could not be submitted.');
    }
  }

  return (
    <div aria-label="Online checkout" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="dialog">
      <div className="flex max-h-[92vh] w-full max-w-md min-w-0 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Online checkout</p>
            <h2 className="mt-1 break-words text-xl font-bold">{course.title}</h2>
          </div>
          <button aria-label="Close checkout" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        {status === 'done' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto size-9 text-emerald-600" />
            <p className="mt-3 font-semibold text-slate-900">Receipt submitted</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Accounting will review it and notify you when course access is active.</p>
            <button className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700" onClick={onClose} type="button">Done</button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid min-w-0 grid-cols-2 gap-2">
              {available.map((channel) => (
                <button
                  className={`min-w-0 rounded-xl border p-3 text-left text-xs ${selected?.method === channel.method ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  key={channel.method}
                  onClick={() => setMethod(channel.method)}
                  type="button"
                >
                  <span className="block truncate font-semibold">{channel.displayName}</span>
                  <span>{channel.currency}</span>
                </button>
              ))}
            </div>
            {selected ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Send {selected.currency === 'EGP' ? course.priceEGP : course.priceUSD} {selected.currency} to</p>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all text-sm text-sky-700">{selected.accountValue}</code>
                  <button aria-label="Copy payment account" className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100" onClick={() => void navigator.clipboard.writeText(selected.accountValue)} type="button"><Copy className="size-4" /></button>
                </div>
                {selected.instructions ? <p className="mt-2 text-xs leading-5 text-slate-500">{selected.instructions}</p> : null}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Online payment channels are not available yet.</p>
            )}
            <label className="mt-3 text-xs font-medium text-slate-700">Transaction reference (optional)
              <input className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" maxLength={120} onChange={(event) => setReference(event.target.value)} value={reference} />
            </label>
            <label className="mt-3 flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:border-sky-300 hover:bg-sky-50">
              <Upload className="size-4 shrink-0 text-sky-600" />
              <span className="min-w-0 flex-1 truncate">{file?.name ?? 'Upload receipt screenshot'}</span>
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            {error ? <p aria-live="polite" className="mt-3 text-xs text-red-600">{error}</p> : null}
            <button className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50" disabled={!selected || status === 'saving'} onClick={() => void submit()} type="button">
              {status === 'saving' ? 'Uploading securely…' : 'Submit for approval'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
