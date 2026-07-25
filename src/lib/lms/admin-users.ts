import 'server-only';

import type { AccountStatus, Role } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const LMS_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const satisfies readonly Role[];
export const LMS_ACCOUNT_STATUSES = [
  'ACTIVE',
  'DISABLED',
] as const satisfies readonly AccountStatus[];

export class AdminUserError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function isLmsRole(value: unknown): value is Role {
  return typeof value === 'string' && LMS_ROLES.includes(value as Role);
}

export function isLmsAccountStatus(value: unknown): value is AccountStatus {
  return (
    typeof value === 'string' &&
    LMS_ACCOUNT_STATUSES.includes(value as AccountStatus)
  );
}

async function requireExactAuthUser(
  supabaseId: string,
  expectedEmail: string,
) {
  const { data, error } =
    await getSupabaseAdminClient().auth.admin.getUserById(supabaseId);

  if (error || !data.user) {
    throw new AdminUserError(
      `Unable to load the matching Supabase Auth user: ${
        error?.message ?? 'user not found'
      }`,
      502,
    );
  }

  if (data.user.email?.trim().toLowerCase() !== expectedEmail) {
    throw new AdminUserError(
      'The Prisma and Supabase Auth identities do not match.',
      409,
    );
  }

  return data.user;
}

async function assertAnotherAdminWillRemain(targetRole: Role) {
  if (targetRole !== 'ADMIN') {
    return;
  }

  const adminCount = await getPrisma().user.count({
    where: { role: 'ADMIN', status: 'ACTIVE' },
  });

  if (adminCount <= 1) {
    throw new AdminUserError(
      'The final active administrator cannot be demoted, disabled, or deleted.',
      409,
    );
  }
}

export async function listAllSupabaseAuthUsers() {
  const users: SupabaseUser[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } =
      await getSupabaseAdminClient().auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new AdminUserError(
        `Unable to load Supabase account statuses: ${error.message}`,
        502,
      );
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      return users;
    }
  }

  throw new AdminUserError(
    'The user directory exceeds the current 10,000-account safety limit.',
    413,
  );
}

export async function updateLmsUserRole({
  actorId,
  role,
  targetId,
}: {
  actorId: string;
  role: Role;
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      email: true,
      id: true,
      role: true,
      status: true,
      supabaseId: true,
    },
  });

  if (!target) {
    throw new AdminUserError('User not found.', 404);
  }

  if (target.id === actorId && target.role !== role) {
    throw new AdminUserError(
      'You cannot change your own administrator role.',
      403,
    );
  }

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    await assertAnotherAdminWillRemain(target.role);
  }

  const authUser = await requireExactAuthUser(
    target.supabaseId,
    target.email,
  );
  const previousRole = target.role;

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role },
    select: { id: true, role: true },
  });

  const userMetadata = authUser.user_metadata ?? {};
  const appMetadata = authUser.app_metadata ?? {};
  const metadataNeedsUpdate =
    userMetadata.role !== role || appMetadata.role !== role;

  if (metadataNeedsUpdate) {
    const { error } =
      await getSupabaseAdminClient().auth.admin.updateUserById(
        target.supabaseId,
        {
          user_metadata: { ...userMetadata, role },
          app_metadata: { ...appMetadata, role },
        },
      );

    if (error) {
      await prisma.user.update({
        where: { id: target.id },
        data: { role: previousRole },
      });
      throw new AdminUserError(
        `Supabase role synchronization failed; the Prisma update was rolled back: ${error.message}`,
        502,
      );
    }
  }

  return updated;
}

export async function updateLmsUserStatus({
  actorId,
  status,
  targetId,
}: {
  actorId: string;
  status: AccountStatus;
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      email: true,
      id: true,
      role: true,
      status: true,
      supabaseId: true,
    },
  });

  if (!target) {
    throw new AdminUserError('User not found.', 404);
  }

  if (target.id === actorId && status !== 'ACTIVE') {
    throw new AdminUserError('You cannot disable your own account.', 403);
  }

  if (target.role === 'ADMIN' && status !== 'ACTIVE') {
    await assertAnotherAdminWillRemain(target.role);
  }

  const authUser = await requireExactAuthUser(
    target.supabaseId,
    target.email,
  );
  const previousStatus = target.status;

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { status },
    select: { id: true, status: true },
  });

  const { error } =
    await getSupabaseAdminClient().auth.admin.updateUserById(
      target.supabaseId,
      {
        app_metadata: {
          ...(authUser.app_metadata ?? {}),
          account_status: status,
        },
        ban_duration: status === 'DISABLED' ? '876000h' : 'none',
      },
    );

  if (error) {
    await prisma.user.update({
      where: { id: target.id },
      data: { status: previousStatus },
    });
    throw new AdminUserError(
      `Supabase account-status synchronization failed; the Prisma update was rolled back: ${error.message}`,
      502,
    );
  }

  return updated;
}

export async function deleteLmsUser({
  actorId,
  targetId,
}: {
  actorId: string;
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      email: true,
      id: true,
      role: true,
      supabaseId: true,
    },
  });

  if (!target) {
    throw new AdminUserError('User not found.', 404);
  }

  if (target.id === actorId) {
    throw new AdminUserError('You cannot delete your own account.', 403);
  }

  await assertAnotherAdminWillRemain(target.role);
  await requireExactAuthUser(target.supabaseId, target.email);

  const { error } =
    await getSupabaseAdminClient().auth.admin.deleteUser(target.supabaseId);

  if (error) {
    throw new AdminUserError(
      `Supabase Auth deletion failed: ${error.message}`,
      502,
    );
  }

  try {
    await prisma.user.delete({ where: { id: target.id } });
  } catch {
    throw new AdminUserError(
      'The Auth identity was deleted, but cascading Prisma cleanup failed. Retry this deletion to remove the remaining profile.',
      500,
    );
  }
}
