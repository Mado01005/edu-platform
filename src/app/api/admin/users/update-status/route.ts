import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  AdminUserError,
  isLmsAccountStatus,
  updateLmsUserStatus,
} from '@/lib/lms/admin-users';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { isSameOriginRequest } from '@/lib/http/same-origin';

export const dynamic = 'force-dynamic';

function assertSameOrigin(request: Request) {
  if (!isSameOriginRequest(request)) {
    throw new AdminUserError('Invalid request origin.', 403);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireLmsRole(['ADMIN']);
    const body = (await request.json()) as {
      status?: unknown;
      targetId?: unknown;
    };

    if (
      typeof body.targetId !== 'string' ||
      !isLmsAccountStatus(body.status)
    ) {
      throw new AdminUserError('A valid targetId and status are required.');
    }

    const user = await updateLmsUserStatus({
      actorId: admin.id,
      status: body.status,
      targetId: body.targetId,
    });

    revalidatePath('/admin/users');
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof AdminUserError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_ADMIN_UPDATE_STATUS]', error);
    return NextResponse.json(
      { error: 'Unable to update this account status.' },
      { status: 500 },
    );
  }
}
