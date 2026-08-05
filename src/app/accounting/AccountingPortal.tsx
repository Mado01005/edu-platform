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

const fieldClass =
  'h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-violet-400';

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
  pendingSubscriptions,
  students,
}: {
  courses: CourseOption[];
  ledger: LedgerRecord[];
  pendingSubscriptions: PendingSubscription[];
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {(error || notice) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            error
              ? 'border-red-400/20 bg-red-400/10 text-red-200'
              : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <BadgeDollarSign className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="mt-2 text-xl">Manual payment entry</CardTitle>
          <p className="text-sm leading-6 text-zinc-400">
            Record USD or EGP cash, wire, and card payments with an auditable
            receipt number.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <form className="flex min-w-0 flex-col gap-3" onSubmit={createPayment}>
            <label className="text-xs font-bold text-zinc-400">
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
              <label className="min-w-0 text-xs font-bold text-zinc-400">
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
              <label className="min-w-0 text-xs font-bold text-zinc-400">
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
              <label className="text-xs font-bold text-zinc-400">
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

            <label className="text-xs font-bold text-zinc-400">
              Payment method
              <select className={`${fieldClass} mt-2`} name="paymentType" required>
                <option value="CASH">Cash</option>
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
              className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
              maxLength={1000}
              name="notes"
              placeholder="Internal notes (optional)"
            />
            <label className="flex min-w-0 items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <input className="mt-1" name="approveNow" type="checkbox" />
              <span className="min-w-0">
                <span className="block font-black">Approve immediately</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
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
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4"
              key={subscription.id}
            >
              <Clock3 className="size-5 shrink-0 text-amber-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">
                  {subscription.studentName}
                </span>
                <span className="block truncate text-xs text-zinc-500">
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
            <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
              No pending subscriptions.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">Recent ledger</h2>
          <Badge variant="secondary">{ledger.length} records</Badge>
        </div>
        {ledger.map((payment) => (
          <article
            className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
            key={payment.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-violet-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black">
                  {payment.studentName}
                </span>
                <span className="block truncate text-xs text-zinc-500">
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
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                      : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
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
                  className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-black hover:bg-white/5"
                  href={`/accounting/receipts/${payment.id}`}
                >
                  <ReceiptText className="size-4" />
                  Digital receipt
                </Link>
              ) : (
                <p className="flex-1 rounded-xl border border-red-400/10 px-3 py-2 text-center text-xs font-bold text-red-300">
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
