import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { loginParentWithVerifiedPhone, ParentPortalError, setParentSessionCookie } from '@/lib/lms/parent-portal';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    const phone = data.user?.phone;
    if (error || !data.user || !phone || !data.user.phone_confirmed_at) {
      return NextResponse.json({ error: 'A verified phone session is required.' }, { status: 401 });
    }
    const session = await loginParentWithVerifiedPhone(data.user.id, phone);
    await setParentSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ParentPortalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[PARENT_PASSWORDLESS_SESSION]', error);
    return NextResponse.json({ error: 'Unable to open the parent portal.' }, { status: 500 });
  }
}
