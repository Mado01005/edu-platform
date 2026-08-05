import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  AccountingError,
  createPendingSubscription,
} from '@/lib/lms/accounting';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AccountingError('Invalid request origin.', 403);
    }
    await requireLmsRole(ACCOUNTING_ROLES);
    const body = (await request.json()) as {
      courseId?: unknown;
      studentId?: unknown;
    };
    if (
      typeof body.courseId !== 'string' ||
      typeof body.studentId !== 'string'
    ) {
      throw new AccountingError('Student and course are required.');
    }
    const subscription = await createPendingSubscription({
      courseId: body.courseId,
      studentId: body.studentId,
    });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountingError || error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[ACCOUNTING_SUBSCRIPTION_CREATE]', error);
    return NextResponse.json(
      { error: 'Unable to create this pending subscription.' },
      { status: 500 },
    );
  }
}
