import type { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export async function requireAdminApiAuth(
  request: Request,
  allowedRoles: readonly Role[] = ADMIN_ROLES,
) {
  const session = await auth();
  if (session?.user?.isAdmin) {
    const role: Role = session.user.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';
    if (role !== 'SUPER_ADMIN' && !allowedRoles.includes(role)) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: 'Forbidden: Insufficient permissions.' },
          { status: 403 },
        ),
      };
    }

    return {
      email: session.user.email ?? '',
      isSuperAdmin: role === 'SUPER_ADMIN',
      name: session.user.name ?? 'Administrator',
      ok: true as const,
      role,
    };
  }

  try {
    const { requireApiAuth } = await import('@/lib/auth-guard');
    const modern = await requireApiAuth(request, {
      allowCookieAuth: true,
      allowedRoles,
    });

    if (!modern.ok) return modern;
    return {
      email: modern.profile?.email ?? modern.user.email ?? '',
      isSuperAdmin: modern.role === 'SUPER_ADMIN',
      name: modern.profile?.name ?? modern.user.email ?? 'Administrator',
      ok: true as const,
      role: modern.role,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Unauthorized: Session missing or invalid.' },
        { status: 401 },
      ),
    };
  }
}
