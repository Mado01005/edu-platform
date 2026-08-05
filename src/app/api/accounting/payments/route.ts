import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  AccountingError,
  createManualPayment,
  readManualPaymentInput,
} from '@/lib/lms/accounting';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AccountingError('Invalid request origin.', 403);
    }
    const actor = await requireLmsRole(ACCOUNTING_ROLES);
    const input = readManualPaymentInput(await request.json());
    const payment = await createManualPayment({ actorId: actor.id, input });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountingError || error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[ACCOUNTING_PAYMENT_CREATE]', error);
    return NextResponse.json(
      { error: 'Unable to record this payment.' },
      { status: 500 },
    );
  }
}
