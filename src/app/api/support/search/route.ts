import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { SUPPORT_ROLES } from '@/lib/lms/roles';
import { searchStudentsForSupport, SupportPortalError } from '@/lib/lms/support';

export async function GET(request: Request) {
  const auth = await requireApiAuth(request, {
    allowCookieAuth: true,
    allowedRoles: SUPPORT_ROLES,
  });
  if (!auth.ok) return auth.response;

  try {
    const query = new URL(request.url).searchParams.get('q') ?? '';
    const users = await searchStudentsForSupport(query);
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof SupportPortalError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[SUPPORT_STUDENT_SEARCH]', error);
    return NextResponse.json({ error: 'Unable to search student accounts.' }, { status: 500 });
  }
}
