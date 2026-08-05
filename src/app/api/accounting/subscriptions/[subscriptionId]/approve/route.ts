import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  AccountingError,
  approveSubscription,
} from '@/lib/lms/accounting';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AccountingError('Invalid request origin.', 403);
    }
    const [actor, { subscriptionId }] = await Promise.all([
      requireLmsRole(ACCOUNTING_ROLES),
      params,
    ]);
    const subscription = await approveSubscription({
      actorId: actor.id,
      subscriptionId,
    });
    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof AccountingError || error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[ACCOUNTING_SUBSCRIPTION_APPROVE]', error);
    return NextResponse.json(
      { error: 'Unable to approve this subscription.' },
      { status: 500 },
    );
  }
}
