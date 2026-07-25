import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  AdminUserError,
  deleteLmsUser,
} from '@/lib/lms/admin-users';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
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
    const admin = await requireLmsRole(['ADMIN']);
    const body = (await request.json()) as { targetId?: unknown };

    if (typeof body.targetId !== 'string') {
      throw new AdminUserError('A valid targetId is required.');
    }

    await deleteLmsUser({
      actorId: admin.id,
      targetId: body.targetId,
    });

    revalidatePath('/admin/users');
    return NextResponse.json({ success: true });
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
