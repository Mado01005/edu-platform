import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  AdminUserError,
  isLmsRole,
  updateLmsUserRole,
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
      role?: unknown;
      targetId?: unknown;
    };

    if (typeof body.targetId !== 'string' || !isLmsRole(body.role)) {
      throw new AdminUserError('A valid targetId and role are required.');
    }

    const user = await updateLmsUserRole({
      actorId: admin.id,
      role: body.role,
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

    console.error('[LMS_ADMIN_UPDATE_ROLE]', error);
    return NextResponse.json(
      { error: 'Unable to update this role.' },
      { status: 500 },
    );
  }
}
