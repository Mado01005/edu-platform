import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { configureParentAccess, ParentPortalError, removeParentStudentLink } from '@/lib/lms/parent-portal';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    await requireLmsRole(ADMIN_ROLES);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 });
    const result = await configureParentAccess({
      parentId: body.parentId,
      pin: body.pin,
      studentId: body.studentId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ParentPortalError || error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[PARENT_ACCESS]', error);
    return NextResponse.json({ error: 'Unable to configure parent access.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    await requireLmsRole(ADMIN_ROLES);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    await removeParentStudentLink(body?.parentId, body?.studentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ParentPortalError || error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[PARENT_ACCESS_DELETE]', error);
    return NextResponse.json({ error: 'Unable to remove parent link.' }, { status: 500 });
  }
}
