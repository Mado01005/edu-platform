import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { OnlinePaymentError, rejectOnlinePayment } from '@/lib/lms/online-payments';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const [actor, { paymentId }, body] = await Promise.all([
      requireLmsRole(ACCOUNTING_ROLES),
      context.params,
      request.json().catch(() => null) as Promise<{ reason?: unknown } | null>,
    ]);
    const result = await rejectOnlinePayment(paymentId, actor.id, body?.reason);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OnlinePaymentError || error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[REJECT_ONLINE_PAYMENT]', error);
    return NextResponse.json({ error: 'Unable to reject payment.' }, { status: 500 });
  }
}
