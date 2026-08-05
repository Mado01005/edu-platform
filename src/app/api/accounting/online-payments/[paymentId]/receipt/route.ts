import { NextResponse } from 'next/server';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const [, { paymentId }] = await Promise.all([
      requireLmsRole(ACCOUNTING_ROLES),
      context.params,
    ]);
    const payment = await getPrisma().onlinePaymentSubmission.findUnique({
      where: { id: paymentId },
      select: { receiptObjectKey: true },
    });
    if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    return NextResponse.redirect(await getPresignedDownloadUrl(payment.receiptObjectKey, 120));
  } catch (error) {
    if (error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[ONLINE_PAYMENT_RECEIPT]', error);
    return NextResponse.json({ error: 'Unable to open receipt.' }, { status: 500 });
  }
}
