import { NextResponse } from 'next/server';
import { AdminUserError } from '@/lib/lms/admin-users';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';
import { isSameOriginRequest } from '@/lib/http/same-origin';

export const dynamic = 'force-dynamic';

function assertSameOrigin(request: Request) {
  if (!isSameOriginRequest(request)) {
    throw new AdminUserError('Invalid request origin.', 403);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireLmsRole(ADMIN_ROLES);
    const body = (await request.json()) as { targetId?: unknown };

    if (typeof body.targetId !== 'string') {
      throw new AdminUserError('A valid targetId is required.');
    }

    void admin;
    throw new AdminUserError(
      'Permanent user deletion is disabled to preserve learning and financial audit history. Disable the account instead.',
      409,
    );
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof AdminUserError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_ADMIN_DELETE_USER]', error);
    return NextResponse.json(
      { error: 'Unable to delete this user.' },
      { status: 500 },
    );
  }
}
