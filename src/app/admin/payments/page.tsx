import { BadgeCheck, Clock3, ReceiptText } from 'lucide-react';
import { PaymentApprovalDesk } from '@/components/Admin/payment-approval-desk';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const user = await requireLmsPageRole(ACCOUNTING_ROLES, 'accounting-required');
  const payments = await getPrisma().onlinePaymentSubmission.findMany({
    where: { status: 'PENDING' },
    include: {
      course: { select: { title: true } },
      module: { select: { title: true } },
      student: { select: { email: true, name: true, phoneNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 300,
  });
  return (
    <PortalShell user={user}>
      <header className="rounded-3xl border border-[#D4AF37]/40 bg-[#FBF6E2] p-5 sm:p-7">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-[#084B2B] text-white"><BadgeCheck className="size-5" /></span>
        <p className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#8C6B1B]"><Clock3 className="size-4" /> 1-click manual review</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Admin payment approval desk</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Verify the full-resolution receipt, then approve immediate course/chapter access or reject it with a note. Approval queues WhatsApp confirmations for the student and parent numbers.</p>
      </header>
      <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-black"><ReceiptText className="size-4 text-[#084B2B]" /> Pending transfers</p><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{payments.length}</span></div>
      <PaymentApprovalDesk payments={payments.map((payment) => ({ amount: payment.amount.toFixed(2), courseTitle: payment.course.title, currency: payment.currency, id: payment.id, method: payment.paymentMethod, moduleTitle: payment.module?.title ?? null, phone: payment.student.phoneNumber, studentName: payment.student.name ?? payment.student.email }))} />
    </PortalShell>
  );
}
