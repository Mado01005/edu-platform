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
  course: {
    id: string;
    modules: { id: string; priceEGP: string; purchased: boolean; title: string }[];
    priceEGP: string;
    priceUSD: string;
    title: string;
  };
  onClose: () => void;
}) {
  const available = useMemo(
    () =>
      channels.filter((channel) =>
        channel.currency === 'EGP'
          ? Number(course.priceEGP) > 0 || course.modules.some((module) => Number(module.priceEGP) > 0 && !module.purchased)
          : Number(course.priceUSD) > 0,
      ),
    [channels, course.modules, course.priceEGP, course.priceUSD],
  );
  const [method, setMethod] = useState(available[0]?.method ?? 'INSTAPAY');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');
  const selected = available.find((channel) => channel.method === method) ?? available[0];
  const selectedModule = course.modules.find((module) => module.id === moduleId) ?? null;
  const amount = selectedModule
    ? selectedModule.priceEGP
    : selected?.currency === 'EGP' ? course.priceEGP : course.priceUSD;
  const eligibleChannels = selectedModule
    ? available.filter((channel) => channel.currency === 'EGP')
    : available;

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
          moduleId: selectedModule?.id ?? null,
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
          moduleId: selectedModule?.id ?? null,
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
      <div className="flex max-h-[92vh] w-full max-w-md min-w-0 flex-col overflow-y-auto rounded-2xl border border-emerald-950/10 bg-white p-4 text-slate-900 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#084B2B]">Online checkout</p>
            <h2 className="mt-1 break-words text-xl font-bold">{course.title}</h2>
          </div>
          <button aria-label="Close checkout" className="rounded-xl border border-emerald-950/10 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        {status === 'done' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto size-9 text-emerald-600" />
            <p className="mt-3 font-semibold text-slate-900">Receipt submitted</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Accounting will review it and notify you when course access is active.</p>
            <button className="mt-4 w-full rounded-xl bg-[#084B2B] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#063B22]" onClick={onClose} type="button">Done</button>
          </div>
        ) : (
          <>
            <fieldset className="mt-5 rounded-xl border border-emerald-950/10 bg-[#F8FAF8] p-3">
              <legend className="px-1 text-xs font-black uppercase tracking-wide text-[#084B2B]">Choose access</legend>
              <label className={`mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-3 text-sm ${moduleId === null ? 'border-[#D4AF37] bg-[#FBF6E2]' : 'border-emerald-950/10 bg-white'}`}><span className="font-black">Complete term package</span><span className="shrink-0 font-black">{course.priceEGP} EGP</span><input checked={moduleId === null} className="sr-only" name="purchase-target" onChange={() => setModuleId(null)} type="radio" /></label>
              {course.modules.filter((module) => Number(module.priceEGP) > 0).map((module) => <label className={`mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-3 text-sm ${moduleId === module.id ? 'border-[#D4AF37] bg-[#FBF6E2]' : 'border-emerald-950/10 bg-white'} ${module.purchased ? 'cursor-not-allowed opacity-50' : ''}`} key={module.id}><span className="min-w-0 truncate font-bold">{module.title}</span><span className="shrink-0 font-black">{module.priceEGP} EGP</span><input checked={moduleId === module.id} className="sr-only" disabled={module.purchased} name="purchase-target" onChange={() => { setModuleId(module.id); const egpChannel = available.find((channel) => channel.currency === 'EGP'); if (egpChannel) setMethod(egpChannel.method); }} type="radio" /></label>)}
            </fieldset>
            <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
              {eligibleChannels.map((channel) => (
                <button
                  className={`min-w-0 rounded-xl border p-3 text-left text-xs ${selected?.method === channel.method ? 'border-emerald-300 bg-emerald-50 text-[#084B2B]' : 'border-emerald-950/10 text-slate-600 hover:bg-[#F8FAF7]'}`}
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
              <div className="mt-3 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Send exactly {amount} {selected.currency} to</p>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <code className="min-w-0 flex-1 break-all text-sm text-[#084B2B]">{selected.accountValue}</code>
                  <button aria-label="Copy payment account" className="shrink-0 rounded-lg border border-emerald-950/10 bg-white p-2 text-slate-600 hover:bg-slate-100" onClick={() => void navigator.clipboard.writeText(selected.accountValue)} type="button"><Copy className="size-4" /></button>
                </div>
                {selected.instructions ? <p className="mt-2 text-xs leading-5 text-slate-500">{selected.instructions}</p> : null}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Online payment channels are not available yet.</p>
            )}
            <label className="mt-3 text-xs font-medium text-slate-700">Transaction reference (optional)
              <input className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" maxLength={120} onChange={(event) => setReference(event.target.value)} value={reference} />
            </label>
            <label className="mt-3 flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:border-emerald-300 hover:bg-emerald-50">
              <Upload className="size-4 shrink-0 text-[#084B2B]" />
              <span className="min-w-0 flex-1 truncate">{file?.name ?? 'Upload receipt screenshot'}</span>
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            {error ? <p aria-live="polite" className="mt-3 text-xs text-red-600">{error}</p> : null}
            <button className="mt-4 w-full rounded-xl bg-[#084B2B] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#063B22] disabled:opacity-50" disabled={!selected || status === 'saving'} onClick={() => void submit()} type="button">
              {status === 'saving' ? 'Uploading securely…' : 'Submit for approval'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
