import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { approveOnlinePayment, OnlinePaymentError } from '@/lib/lms/online-payments';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const [actor, { paymentId }] = await Promise.all([
      requireLmsRole(ACCOUNTING_ROLES),
      context.params,
    ]);
    const result = await approveOnlinePayment(paymentId, actor.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OnlinePaymentError || error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[APPROVE_ONLINE_PAYMENT]', error);
    return NextResponse.json({ error: 'Unable to approve payment.' }, { status: 500 });
  }
}
