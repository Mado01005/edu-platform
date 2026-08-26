import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { phone?: unknown } | null;
  const phone = normalizePhoneNumber(typeof body?.phone === 'string' ? body.phone : '');
  if (!phone || !isValidE164PhoneNumber(phone)) {
    return NextResponse.json({ error: 'Enter a valid international phone number.' }, { status: 400 });
  }
  const linked = await getPrisma().user.count({
    where: { parentPhone: phone, role: 'STUDENT', status: 'ACTIVE' },
  });
  if (!linked) {
    return NextResponse.json({ error: 'No active student is linked to this parent number.' }, { status: 404 });
  }
  return NextResponse.json({ phone });
}
