import { Banknote, Clock3, ReceiptText } from 'lucide-react';
import { AccountingPortal } from '@/app/accounting/AccountingPortal';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  const accountingUser = await requireLmsPageRole(
    ACCOUNTING_ROLES,
    'accounting-required',
  );
  const prisma = getPrisma();
  const [students, courses, subscriptions, ledger, onlinePayments, savedChannels] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: { email: true, id: true, name: true },
      take: 1_000,
    }),
    prisma.course.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
      take: 500,
    }),
    prisma.studentSubscription.findMany({
      where: { status: 'PENDING' },
      include: {
        course: { select: { title: true } },
        student: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.uSDManualLedger.findMany({
      include: { student: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.onlinePaymentSubmission.findMany({
      where: { status: 'PENDING' },
      include: {
        course: { select: { title: true } },
        student: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.paymentChannel.findMany({ orderBy: { method: 'asc' } }),
  ]);

  const pendingPayments = ledger.filter(({ status }) => status === 'PENDING');
  const approvedPayments = ledger.filter(({ status }) => status === 'APPROVED');

  return (
    <PortalShell user={accountingUser}>
      <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.2),transparent_55%)] p-5">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-300 text-black">
          <Banknote className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          Restricted finance workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Accounting ledger
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Approve subscriptions and keep immutable USD/EGP receipt records.
        </p>
      </header>

      <section className="grid min-w-0 grid-cols-3 gap-2">
        {[
          {
            icon: Clock3,
            label: 'Pending',
            value: pendingPayments.length + subscriptions.length + onlinePayments.length,
          },
          {
            icon: ReceiptText,
            label: 'Approved',
            value: approvedPayments.length,
          },
          { icon: Banknote, label: 'Students', value: students.length },
        ].map(({ icon: Icon, label, value }) => (
          <div
            className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 p-3 text-center"
            key={label}
          >
            <Icon className="mx-auto size-4 text-emerald-300" aria-hidden="true" />
            <p className="mt-2 text-xl font-black">{value}</p>
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              {label}
            </p>
          </div>
        ))}
      </section>

      <AccountingPortal
        courses={courses}
        ledger={ledger.map((payment) => ({
          amount: (
            payment.currency === 'EGP'
              ? payment.amountEGP
              : payment.amountUSD
          )?.toFixed(2) ?? '0.00',
          approvedAt: payment.approvedAt?.toISOString() ?? null,
          createdAt: payment.createdAt.toISOString(),
          currency: payment.currency,
          id: payment.id,
          paymentType: payment.paymentType,
          receiptNumber: payment.receiptNumber,
          status: payment.status,
          studentName: payment.student.name ?? payment.student.email,
        }))}
        onlinePayments={onlinePayments.map((payment) => ({
          amount: payment.amount.toFixed(2),
          courseTitle: payment.course.title,
          createdAt: payment.createdAt.toISOString(),
          currency: payment.currency,
          id: payment.id,
          method: payment.paymentMethod,
          studentName: payment.student.name ?? payment.student.email,
        }))}
        paymentChannels={([
          'INSTAPAY',
          'VODAFONE_CASH',
          'ONLINE_CARD',
          'USD_WIRE',
          'PAYPAL',
        ] as const).map((method) => {
          const channel = savedChannels.find((item) => item.method === method);
          return {
            accountValue: channel?.accountValue ?? '',
            displayName: channel?.displayName ?? method.replaceAll('_', ' '),
            instructions: channel?.instructions ?? null,
            isActive: channel?.isActive ?? false,
            method,
          };
        })}
        pendingSubscriptions={subscriptions.map((subscription) => ({
          courseTitle: subscription.course.title,
          id: subscription.id,
          studentId: subscription.studentId,
          studentName:
            subscription.student.name ?? subscription.student.email,
        }))}
        students={students.map((student) => ({
          id: student.id,
          label: `${student.name ?? 'Unnamed student'} · ${student.email}`,
        }))}
      />
    </PortalShell>
  );
}
