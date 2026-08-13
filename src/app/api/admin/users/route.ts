import type { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth as legacyAuth } from '@/auth';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { AdminUserError } from '@/lib/lms/admin-users';
import { permanentlyDeleteUsers } from '@/lib/lms/admin-user-deletion';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

function stringArray(value: unknown) {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  if (!values.every((entry) => typeof entry === 'string')) {
    throw new AdminUserError('Account identifiers must be strings.');
  }
  return values as string[];
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AdminUserError('Invalid request origin.', 403);
    }

    let actor: { email: string; id: string | null; role: Role | 'LEGACY_SUPER_ADMIN' } | null = null;
    try {
      const lmsAdmin = await requireLmsRole(ADMIN_ROLES);
      actor = { email: lmsAdmin.email, id: lmsAdmin.id, role: lmsAdmin.role };
    } catch (error) {
      if (!(error instanceof LmsAuthError)) throw error;
    }
    if (!actor) {
      const session = await legacyAuth();
      if (!session?.user?.email || !session.user.isSuperAdmin) {
        throw new AdminUserError('Super administrator access is required.', 403);
      }
      actor = { email: session.user.email, id: null, role: 'LEGACY_SUPER_ADMIN' };
    }

    const body = (await request.json()) as Record<string, unknown>;
    const userIds = stringArray(body.userIds ?? body.targetId);
    const emails = stringArray(body.emails ?? body.email);
    const result = await permanentlyDeleteUsers({
      actorEmail: actor.email,
      actorId: actor.id,
      actorRole: actor.role,
      emails,
      userIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    if (error instanceof AdminUserError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LMS_ADMIN_DELETE_USERS]', error);
    return NextResponse.json({ error: 'Unable to delete the selected accounts.' }, { status: 500 });
  }
}
