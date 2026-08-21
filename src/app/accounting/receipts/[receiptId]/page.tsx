import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ReceiptText } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AccountingReceiptPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const [user, { receiptId }] = await Promise.all([
    requireLmsPageRole(ACCOUNTING_ROLES, 'accounting-required'),
    params,
  ]);
  const receipt = await getPrisma().uSDManualLedger.findFirst({
    where: { id: receiptId, status: 'APPROVED' },
    include: {
      approvedBy: { select: { email: true, name: true } },
      student: { select: { email: true, name: true } },
    },
  });
  if (!receipt) notFound();

  const originalAmount =
    receipt.currency === 'EGP' ? receipt.amountEGP : receipt.amountUSD;

  return (
    <PortalShell user={user}>
      <Link
        className="flex w-fit items-center gap-2 text-sm font-bold text-[#084B2B] hover:text-[#063B22]"
        href="/accounting"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to accounting
      </Link>

      <article className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
        <header className="border-b border-[#D4AF37]/40 bg-[#FDF8E8] p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#084B2B] text-white">
              <ReceiptText className="size-6" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              APPROVED
            </span>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#8C6B1B]">
            Oqool Academy
          </p>
          <h1 className="mt-2 break-words text-3xl font-black">
            Digital receipt
          </h1>
          <p className="mt-2 break-all text-sm text-slate-600">
            {receipt.receiptNumber}
          </p>
        </header>

        <dl className="grid min-w-0 grid-cols-1 gap-px bg-emerald-950/10 sm:grid-cols-2">
          {[
            ['Student', receipt.student.name ?? receipt.student.email],
            ['Email', receipt.student.email],
            [
              'Amount',
              `${originalAmount?.toFixed(2) ?? '0.00'} ${receipt.currency}`,
            ],
            ['USD equivalent', `$${receipt.amountUSD?.toFixed(2) ?? '0.00'}`],
            ['Method', receipt.paymentType.replaceAll('_', ' ')],
            [
              'Approved',
              receipt.approvedAt?.toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'UTC',
              }) ?? '—',
            ],
            [
              'Approved by',
              receipt.approvedBy?.name ?? receipt.approvedBy?.email ?? '—',
            ],
            ['Recorded', receipt.createdAt.toISOString().slice(0, 10)],
          ].map(([label, value]) => (
            <div className="min-w-0 bg-white p-4" key={label}>
              <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm font-bold text-slate-900">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {receipt.receiptUrl ? (
          <a
            className="m-5 flex min-h-11 items-center justify-center rounded-xl bg-[#084B2B] px-4 text-sm font-black text-white transition hover:bg-[#063B22]"
            href={receipt.receiptUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open payment proof
          </a>
        ) : null}
      </article>
    </PortalShell>
  );
}
