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
    <div aria-label="Online checkout" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center" role="dialog">
      <div className="flex max-h-[92vh] w-full max-w-md min-w-0 flex-col overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-4 text-white shadow-2xl">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">100% online checkout</p>
            <h2 className="mt-1 break-words text-xl font-black">{course.title}</h2>
          </div>
          <button aria-label="Close checkout" className="rounded-xl border border-white/10 p-2" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        {status === 'done' ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center">
            <CheckCircle2 className="mx-auto size-9 text-emerald-300" />
            <p className="mt-3 font-black">Receipt submitted</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">Accounting will review it and notify you when course access is active.</p>
            <button className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-black" onClick={onClose} type="button">Done</button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid min-w-0 grid-cols-2 gap-2">
              {available.map((channel) => (
                <button
                  className={`min-w-0 rounded-xl border p-3 text-left text-xs ${selected?.method === channel.method ? 'border-emerald-300 bg-emerald-300/10 text-white' : 'border-white/10 text-zinc-400'}`}
                  key={channel.method}
                  onClick={() => setMethod(channel.method)}
                  type="button"
                >
                  <span className="block truncate font-black">{channel.displayName}</span>
                  <span>{channel.currency}</span>
                </button>
              ))}
            </div>
            {selected ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Send {selected.currency === 'EGP' ? course.priceEGP : course.priceUSD} {selected.currency} to</p>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all text-sm text-emerald-300">{selected.accountValue}</code>
                  <button aria-label="Copy payment account" className="shrink-0 rounded-lg border border-white/10 p-2" onClick={() => void navigator.clipboard.writeText(selected.accountValue)} type="button"><Copy className="size-4" /></button>
                </div>
                {selected.instructions ? <p className="mt-2 text-xs leading-5 text-zinc-500">{selected.instructions}</p> : null}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">Online payment channels are not available yet.</p>
            )}
            <label className="mt-3 text-xs font-bold text-zinc-300">Transaction reference (optional)
              <input className="mt-1 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm" maxLength={120} onChange={(event) => setReference(event.target.value)} value={reference} />
            </label>
            <label className="mt-3 flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 p-3 text-sm text-zinc-400">
              <Upload className="size-4 shrink-0 text-emerald-300" />
              <span className="min-w-0 flex-1 truncate">{file?.name ?? 'Upload receipt screenshot'}</span>
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            {error ? <p aria-live="polite" className="mt-3 text-xs text-red-300">{error}</p> : null}
            <button className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50" disabled={!selected || status === 'saving'} onClick={() => void submit()} type="button">
              {status === 'saving' ? 'Uploading securely…' : 'Submit for approval'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
