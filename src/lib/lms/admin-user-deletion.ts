import 'server-only';

import type { Role } from '@prisma/client';
import { isMasterAdmin } from '@/lib/constants';
import { AdminUserError, listAllSupabaseAuthUsers } from '@/lib/lms/admin-users';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { supabaseAdmin } from '@/lib/supabase';

type DeleteUsersInput = {
  actorEmail: string;
  actorId: string | null;
  actorRole: Role | 'LEGACY_SUPER_ADMIN';
  emails: string[];
  userIds: string[];
};

function normalizeEmails(values: string[]) {
  return Array.from(new Set(values.map((email) => email.trim().toLowerCase()).filter(Boolean)));
}

export async function permanentlyDeleteUsers({
  actorEmail,
  actorId,
  actorRole,
  emails,
  userIds,
}: DeleteUsersInput) {
  const normalizedEmails = normalizeEmails(emails);
  const uniqueIds = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length && !normalizedEmails.length) {
    throw new AdminUserError('Select at least one account to delete.');
  }
  if (uniqueIds.length + normalizedEmails.length > 100) {
    throw new AdminUserError('Delete at most 100 accounts at a time.', 413);
  }

  const prisma = getPrisma();
  const legacyIds = uniqueIds.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  );
  const prismaUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(uniqueIds.length ? [{ id: { in: uniqueIds } }] : []),
        ...(normalizedEmails.length ? [{ email: { in: normalizedEmails, mode: 'insensitive' as const } }] : []),
      ],
    },
    select: { email: true, id: true, role: true, supabaseId: true },
  });

  const legacyResults = await Promise.all([
    legacyIds.length
      ? supabaseAdmin.from('user_roles').select('id,email,role').in('id', legacyIds)
      : Promise.resolve({ data: [], error: null }),
    normalizedEmails.length
      ? supabaseAdmin.from('user_roles').select('id,email,role').in('email', normalizedEmails)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const legacyError = legacyResults.find((result) => result.error)?.error;
  if (legacyError) {
    throw new AdminUserError(`Unable to inspect legacy accounts: ${legacyError.message}`, 502);
  }
  const legacyRows = Array.from(
    new Map(
      legacyResults.flatMap((result) => result.data ?? []).map((row) => [row.id, row]),
    ).values(),
  );

  const targetEmails = normalizeEmails([
    ...normalizedEmails,
    ...prismaUsers.map((user) => user.email),
    ...legacyRows.map((row) => row.email),
  ]);
  const targetIds = prismaUsers.map((user) => user.id);
  if (!targetIds.length && !legacyRows.length && !targetEmails.length) {
    throw new AdminUserError('No matching accounts were found.', 404);
  }
  if (
    (actorId && targetIds.includes(actorId)) ||
    targetEmails.includes(actorEmail.trim().toLowerCase())
  ) {
    throw new AdminUserError('You cannot delete your own administrator account.', 403);
  }
  if (targetEmails.some(isMasterAdmin)) {
    throw new AdminUserError('A protected master administrator cannot be deleted.', 403);
  }

  const deletingSuperAdmin = prismaUsers.some((user) => user.role === 'SUPER_ADMIN') ||
    legacyRows.some((row) => row.role === 'superadmin');
  const actorIsSuperAdmin = actorRole === 'SUPER_ADMIN' || actorRole === 'LEGACY_SUPER_ADMIN';
  if (deletingSuperAdmin && !actorIsSuperAdmin) {
    throw new AdminUserError('Only a super administrator can delete another administrator.', 403);
  }
  if (prismaUsers.some((user) => user.role === 'SUPER_ADMIN')) {
    const remainingSuperAdmins = await prisma.user.count({
      where: { id: { notIn: targetIds }, role: 'SUPER_ADMIN', status: 'ACTIVE' },
    });
    if (remainingSuperAdmins < 1) {
      throw new AdminUserError('The final active super administrator cannot be deleted.', 409);
    }
  }

  if (targetIds.length) {
    const [subjectCount, courseCount, auditCounts] = await Promise.all([
      prisma.subject.count({ where: { teacherId: { in: targetIds } } }),
      prisma.course.count({ where: { teacherId: { in: targetIds } } }),
      Promise.all([
        prisma.uSDManualLedger.count({
          where: { OR: [{ studentId: { in: targetIds } }, { createdById: { in: targetIds } }, { approvedById: { in: targetIds } }] },
        }),
        prisma.studentSubscription.count({
          where: { OR: [{ studentId: { in: targetIds } }, { approvedById: { in: targetIds } }] },
        }),
        prisma.paymentChannel.count({ where: { updatedById: { in: targetIds } } }),
        prisma.onlinePaymentSubmission.count({
          where: { OR: [{ studentId: { in: targetIds } }, { reviewedById: { in: targetIds } }] },
        }),
      ]),
    ]);
    if (subjectCount || courseCount) {
      throw new AdminUserError(
        'Reassign this staff member\'s subjects and courses before deleting the account.',
        409,
      );
    }
    if (auditCounts.some(Boolean)) {
      throw new AdminUserError(
        'This account has financial or subscription audit records and cannot be permanently deleted.',
        409,
      );
    }
  }

  const authUsers = await listAllSupabaseAuthUsers();
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const authByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [user.email!.trim().toLowerCase(), user]),
  );
  const authTargets = Array.from(
    new Map(
      [
        ...prismaUsers.map((user) => authById.get(user.supabaseId)),
        ...targetEmails.map((email) => authByEmail.get(email)),
      ]
        .filter((user): user is NonNullable<typeof user> => Boolean(user))
        .map((user) => [user.id, user]),
    ).values(),
  );

  if (targetIds.length) {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.deleteMany({ where: { id: { in: targetIds } } });
    });
  }
  if (targetEmails.length) {
    const { error } = await supabaseAdmin.from('user_roles').delete().in('email', targetEmails);
    if (error) {
      throw new AdminUserError(
        `Database accounts were deleted, but legacy role cleanup failed: ${error.message}`,
        502,
      );
    }
  }

  const authFailures: string[] = [];
  for (const authUser of authTargets) {
    const { error } = await getSupabaseAdminClient().auth.admin.deleteUser(authUser.id);
    if (error) authFailures.push(authUser.email ?? authUser.id);
  }
  if (authFailures.length) {
    throw new AdminUserError(
      `PostgreSQL cleanup succeeded, but Supabase Auth deletion failed for: ${authFailures.join(', ')}.`,
      502,
    );
  }

  return {
    count: targetEmails.length,
    deletedEmails: targetEmails,
    deletedUserIds: targetIds,
    success: true,
  };
}
