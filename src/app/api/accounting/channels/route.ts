import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { OnlinePaymentError, updatePaymentChannel } from '@/lib/lms/online-payments';
import { ACCOUNTING_ROLES } from '@/lib/lms/roles';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const actor = await requireLmsRole(ACCOUNTING_ROLES);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 });
    const channel = await updatePaymentChannel({
      actorId: actor.id,
      accountValue: body.accountValue,
      displayName: body.displayName,
      instructions: body.instructions,
      isActive: body.isActive,
      method: body.method,
    });
    revalidateTag('catalog', 'max');
    return NextResponse.json({ id: channel.id });
  } catch (error) {
    if (error instanceof OnlinePaymentError || error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[PAYMENT_CHANNEL]', error);
    return NextResponse.json({ error: 'Unable to save payment channel.' }, { status: 500 });
  }
}
