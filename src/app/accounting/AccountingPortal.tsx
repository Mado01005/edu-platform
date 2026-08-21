'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Settings2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Input } from '@/components/UI/input';

type StudentOption = { id: string; label: string };
type CourseOption = { id: string; title: string };
type PendingSubscription = {
  courseTitle: string;
  id: string;
  studentId: string;
  studentName: string;
};
type LedgerRecord = {
  amount: string;
  approvedAt: string | null;
  createdAt: string;
  currency: 'USD' | 'EGP';
  id: string;
  paymentType: string;
  receiptNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  studentName: string;
};
type OnlinePaymentRecord = {
  amount: string;
  courseTitle: string;
  createdAt: string;
  currency: 'USD' | 'EGP';
  id: string;
  method: string;
  studentName: string;
};
type PaymentChannelRecord = {
  accountValue: string;
  displayName: string;
  instructions: string | null;
  isActive: boolean;
  method: 'INSTAPAY' | 'VODAFONE_CASH' | 'ONLINE_CARD' | 'USD_WIRE' | 'PAYPAL';
};

const fieldClass =
  'h-12 w-full min-w-0 rounded-xl border border-emerald-950/10 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500';

async function readResponse(response: Response) {
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error || 'The accounting change could not be saved.');
  }
  return body;
}

export function AccountingPortal({
  courses,
  ledger,
  onlinePayments,
  pendingSubscriptions,
  paymentChannels,
  students,
}: {
  courses: CourseOption[];
  ledger: LedgerRecord[];
  onlinePayments: OnlinePaymentRecord[];
  pendingSubscriptions: PendingSubscription[];
  paymentChannels: PaymentChannelRecord[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<'USD' | 'EGP'>('USD');
  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [refreshPending, startRefresh] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isBusy = pendingAction !== null || refreshPending;
  const matchingSubscriptions = useMemo(
    () =>
      pendingSubscriptions.filter(
        (subscription) => subscription.studentId === paymentStudentId,
      ),
    [paymentStudentId, pendingSubscriptions],
  );

  async function createPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setPendingAction('payment:create');
    setError('');
    setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await readResponse(
        await fetch('/api/accounting/payments', {
          body: JSON.stringify({
            amount: data.get('amount'),
            approveNow: data.get('approveNow') === 'on',
            currency,
            exchangeRate: data.get('exchangeRate'),
            notes: data.get('notes'),
            paymentType: data.get('paymentType'),
            receiptNumber: data.get('receiptNumber'),
            receiptUrl: data.get('receiptUrl'),
            studentId: data.get('studentId'),
            subscriptionId: data.get('subscriptionId') || null,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      );
      form.reset();
      setCurrency('USD');
      setPaymentStudentId('');
      setNotice('Payment recorded and receipt tracking started.');
      startRefresh(() => router.refresh());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to record this payment.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function createSubscription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    setPendingAction('subscription:create');
    setError('');
    setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await readResponse(
        await fetch('/api/accounting/subscriptions', {
          body: JSON.stringify({
            courseId: data.get('courseId'),
            studentId: data.get('studentId'),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      );
      form.reset();
      setNotice('Pending subscription added to the approval queue.');
      startRefresh(() => router.refresh());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create this subscription.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function approve(kind: 'payments' | 'subscriptions', id: string) {
    if (isBusy) return;
    setPendingAction(`${kind}:${id}`);
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(`/api/accounting/${kind}/${id}/approve`, {
          method: 'POST',
        }),
      );
      setNotice(
        kind === 'payments'
          ? 'Payment approved and the student was notified.'
          : 'Subscription approved and course access activated.',
      );
      startRefresh(() => router.refresh());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to approve this record.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function reviewOnlinePayment(id: string, decision: 'approve' | 'reject') {
    if (isBusy) return;
    const reason = decision === 'reject' ? window.prompt('Why is this receipt invalid?') : null;
    if (decision === 'reject' && !reason?.trim()) return;
    setPendingAction(`online:${id}:${decision}`);
    setError('');
    setNotice('');
    try {
      await readResponse(
        await fetch(`/api/accounting/online-payments/${id}/${decision}`, {
          ...(decision === 'reject'
            ? { body: JSON.stringify({ reason }), headers: { 'Content-Type': 'application/json' } }
            : {}),
          method: 'POST',
        }),
      );
      setNotice(decision === 'approve' ? 'Payment approved and course access activated.' : 'Receipt rejected and the family was notified.');
      startRefresh(() => router.refresh());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to review payment.');
    } finally {
      setPendingAction(null);
    }
  }

  async function saveChannel(event: React.FormEvent<HTMLFormElement>, method: PaymentChannelRecord['method']) {
    event.preventDefault();
    if (isBusy) return;
    const data = new FormData(event.currentTarget);
    setPendingAction(`channel:${method}`);
    setError('');
    setNotice('');
    try {
      await readResponse(await fetch('/api/accounting/channels', {
        body: JSON.stringify({
          accountValue: data.get('accountValue'),
          displayName: data.get('displayName'),
          instructions: data.get('instructions'),
          isActive: data.get('isActive') === 'on',
          method,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }));
      setNotice('Online payment channel saved.');
      startRefresh(() => router.refresh());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save channel.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {(error || notice) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </div>
      )}

      <Card className="scroll-mt-28" id="invoice-generator">
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BadgeDollarSign className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="mt-2 text-xl">Manual payment entry</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Record legacy USD or EGP wire and card payments with an auditable
            receipt number.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form className="flex min-w-0 flex-col gap-3" onSubmit={createPayment}>
            <label className="text-xs font-bold text-slate-700">
              Student
              <select
                className={`${fieldClass} mt-2`}
                disabled={isBusy}
                name="studentId"
                onChange={(event) => setPaymentStudentId(event.target.value)}
                required
                value={paymentStudentId}
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <label className="min-w-0 text-xs font-bold text-slate-700">
                Currency
                <select
                  className={`${fieldClass} mt-2`}
                  name="currency"
                  onChange={(event) =>
                    setCurrency(event.target.value as 'USD' | 'EGP')
                  }
                  value={currency}
                >
                  <option value="USD">USD</option>
                  <option value="EGP">EGP</option>
                </select>
              </label>
              <label className="min-w-0 text-xs font-bold text-slate-700">
                Amount
                <Input
                  className="mt-2"
                  inputMode="decimal"
                  name="amount"
                  placeholder="0.00"
                  required
                />
              </label>
            </div>

            {currency === 'EGP' ? (
              <label className="text-xs font-bold text-slate-700">
                EGP per USD exchange rate
                <Input
                  className="mt-2"
                  inputMode="decimal"
                  name="exchangeRate"
                  placeholder="50.0000"
                  required
                />
              </label>
            ) : null}

            <label className="text-xs font-bold text-slate-700">
              Payment method
              <select className={`${fieldClass} mt-2`} name="paymentType" required>
                <option value="WIRE_TRANSFER">Wire transfer</option>
                <option value="ONLINE_CARD">Online card</option>
              </select>
            </label>

            <Input
              aria-label="Receipt number"
              name="receiptNumber"
              placeholder="Receipt number"
              required
            />
            <Input
              aria-label="Receipt proof URL"
              name="receiptUrl"
              placeholder="Receipt proof HTTPS URL (optional)"
              type="url"
            />
            <select
              aria-label="Linked pending subscription"
              className={fieldClass}
              disabled={isBusy || !paymentStudentId}
              name="subscriptionId"
            >
              <option value="">No linked subscription</option>
              {matchingSubscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.studentName} · {subscription.courseTitle}
                </option>
              ))}
            </select>
            <textarea
              aria-label="Internal payment notes"
              className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-emerald-950/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100"
              maxLength={1000}
              name="notes"
              placeholder="Internal notes (optional)"
            />
            <label className="flex min-w-0 items-start gap-3 rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-3 text-sm text-slate-900">
              <input className="mt-1" name="approveNow" type="checkbox" />
              <span className="min-w-0">
                <span className="block font-black">Approve immediately</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  Issue the digital receipt and notify the student now.
                </span>
              </span>
            </label>
            <Button
              className="w-full"
              disabled={isBusy}
              type="submit"
            >
              {pendingAction === 'payment:create' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ReceiptText className="size-4" />
              )}
              Record payment
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="scroll-mt-28" id="payment-approvals">
        <CardHeader>
          <CardTitle className="text-xl">Online receipt approval desk</CardTitle>
          <p className="text-sm leading-6 text-slate-600">Private screenshot uploads remain inaccessible until an authorized reviewer opens a short-lived preview.</p>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3 pt-5">
          {onlinePayments.map((payment) => (
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4" key={payment.id}>
              <div className="flex min-w-0 items-start gap-3">
                <Upload className="size-5 shrink-0 text-amber-600" />
                <span className="min-w-0 flex-1"><span className="block truncate font-black text-slate-900">{payment.studentName}</span><span className="block truncate text-xs text-slate-600">{payment.courseTitle} · {payment.method.replaceAll('_', ' ')}</span></span>
                <span className="shrink-0 text-sm font-black">{payment.amount} {payment.currency}</span>
              </div>
              <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
                <a className="flex min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-black text-slate-700 hover:bg-[#F8FAF7]" href={`/api/accounting/online-payments/${payment.id}/receipt`} rel="noopener noreferrer" target="_blank">View</a>
                <button className="rounded-xl bg-[#084B2B] px-2 py-2 text-xs font-black text-white transition hover:bg-[#063B22] disabled:opacity-50" disabled={isBusy} onClick={() => void reviewOnlinePayment(payment.id, 'approve')} type="button">Approve</button>
                <button className="rounded-xl border border-red-200 bg-white px-2 py-2 text-xs font-black text-red-700 disabled:opacity-50" disabled={isBusy} onClick={() => void reviewOnlinePayment(payment.id, 'reject')} type="button">Reject</button>
              </div>
            </article>
          ))}
          {!onlinePayments.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-[#F8FAF7] p-6 text-center text-sm text-slate-600">No pending online receipts.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#084B2B]"><Settings2 className="size-5" /></span><CardTitle className="mt-2 text-xl">Digital payment channels</CardTitle></CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3 pt-5">
          {paymentChannels.map((channel) => (
            <form className="flex min-w-0 flex-col gap-2 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-3" key={channel.method} onSubmit={(event) => void saveChannel(event, channel.method)}>
              <input className={fieldClass} defaultValue={channel.displayName} name="displayName" placeholder="Display name" required />
              <input className={fieldClass} defaultValue={channel.accountValue} name="accountValue" placeholder="Wallet, handle, or account" required />
              <textarea className="min-h-20 w-full min-w-0 rounded-xl border border-emerald-950/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" defaultValue={channel.instructions ?? ''} name="instructions" placeholder="Student instructions" />
              <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs font-bold"><input defaultChecked={channel.isActive} name="isActive" type="checkbox" /> Active</label><Button disabled={isBusy} size="sm" type="submit">Save {channel.method.replaceAll('_', ' ')}</Button></div>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Subscription approval queue</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3 pt-5">
          <form className="flex min-w-0 flex-col gap-3" onSubmit={createSubscription}>
            <select
              aria-label="Subscription student"
              className={fieldClass}
              disabled={isBusy}
              name="studentId"
              required
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Subscription course"
              className={fieldClass}
              disabled={isBusy}
              name="courseId"
              required
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <Button
              disabled={isBusy}
              type="submit"
              variant="outline"
            >
              {pendingAction === 'subscription:create' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add pending subscription
            </Button>
          </form>

          {pendingSubscriptions.map((subscription) => (
            <article
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
              key={subscription.id}
            >
              <Clock3 className="size-5 shrink-0 text-amber-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">
                  {subscription.studentName}
                </span>
                <span className="block truncate text-xs text-slate-600">
                  {subscription.courseTitle}
                </span>
              </span>
              <Button
                disabled={isBusy}
                onClick={() => void approve('subscriptions', subscription.id)}
                size="sm"
              >
                {pendingAction === `subscriptions:${subscription.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Approve
              </Button>
            </article>
          ))}
          {!pendingSubscriptions.length ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-[#F8FAF7] p-6 text-center text-sm text-slate-600">
              No pending subscriptions.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex min-w-0 scroll-mt-28 flex-col gap-3" id="revenue-ledger">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Recent ledger</h2>
          <Badge variant="secondary">{ledger.length} records</Badge>
        </div>
        {ledger.map((payment) => (
          <article
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm"
            key={payment.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-[#084B2B]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">
                  {payment.studentName}
                </span>
                <span className="block truncate text-xs text-slate-600">
                  {payment.receiptNumber} · {payment.paymentType.replaceAll('_', ' ')}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-black">
                  {payment.amount} {payment.currency}
                </span>
                <Badge
                  className={
                    payment.status === 'APPROVED'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-800'
                  }
                >
                  {payment.status}
                </Badge>
              </span>
            </div>
            <div className="flex min-w-0 gap-2">
              {payment.status === 'PENDING' ? (
                <Button
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() => void approve('payments', payment.id)}
                  size="sm"
                >
                  {pendingAction === `payments:${payment.id}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Approve payment
                </Button>
              ) : payment.status === 'APPROVED' ? (
                <Link
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-3 text-sm font-black text-white transition hover:bg-[#063B22]"
                  href={`/accounting/receipts/${payment.id}`}
                >
                  <ReceiptText className="size-4" />
                  Issue receipt
                </Link>
              ) : (
                <p className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700">
                  No receipt issued
                </p>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
