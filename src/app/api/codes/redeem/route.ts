import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { AccessCodeError, redeemDigitalAccessCode } from '@/lib/lms/access-codes';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const student = await requireLmsRole(['STUDENT']);
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    const result = await redeemDigitalAccessCode(student.id, body?.code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccessCodeError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[REDEEM_ACCESS_CODE]', error);
    return NextResponse.json({ error: 'Unable to redeem this access code.' }, { status: 500 });
  }
}
