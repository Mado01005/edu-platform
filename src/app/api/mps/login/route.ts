import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { loginParentPortal, ParentPortalError, setParentSessionCookie } from '@/lib/lms/parent-portal';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const body = (await request.json().catch(() => null)) as { phone?: unknown; pin?: unknown } | null;
    const session = await loginParentPortal(body?.phone, body?.pin);
    await setParentSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ParentPortalError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[MPS_LOGIN]', error);
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
