import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { OnlinePaymentError, submitOnlinePayment } from '@/lib/lms/online-payments';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const student = await requireLmsRole(['STUDENT']);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 });
    const payment = await submitOnlinePayment({
      courseId: body.courseId,
      method: body.method,
      moduleId: body.moduleId,
      receiptContentType: body.receiptContentType,
      receiptObjectKey: body.receiptObjectKey,
      studentId: student.id,
      transactionReference: body.transactionReference,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof OnlinePaymentError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CHECKOUT_SUBMIT]', error);
    return NextResponse.json({ error: 'Unable to submit this payment.' }, { status: 500 });
  }
}
