import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  AccountingError,
  approvePayment,
} from '@/lib/lms/accounting';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AccountingError('Invalid request origin.', 403);
    }
    const [actor, { paymentId }] = await Promise.all([
      requireLmsRole(ACCOUNTING_ROLES),
      params,
    ]);
    const payment = await approvePayment({ actorId: actor.id, paymentId });
    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof AccountingError || error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[ACCOUNTING_PAYMENT_APPROVE]', error);
    return NextResponse.json(
      { error: 'Unable to approve this payment.' },
      { status: 500 },
    );
  }
}
