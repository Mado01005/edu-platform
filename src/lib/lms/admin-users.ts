import 'server-only';

import type { AccountStatus, Prisma, Role } from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export { isLmsRole } from '@/lib/lms/roles';
export const LMS_ACCOUNT_STATUSES = [
  'ACTIVE',
  'DISABLED',
] as const satisfies readonly AccountStatus[];

const SUPER_ADMIN_ADVISORY_LOCK = 2_026_080_501;

export class AdminUserError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
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

function assertActorCanManageRole(
  actorRole: Role,
  targetRole: Role,
  nextRole?: Role,
) {
  if (
    actorRole !== 'SUPER_ADMIN' &&
    (targetRole === 'SUPER_ADMIN' || nextRole === 'SUPER_ADMIN')
  ) {
    throw new AdminUserError(
      'Only a super administrator can manage super administrator access.',
      403,
    );
  }
}

async function assertAnotherSuperAdminWillRemain(
  targetRole: Role,
  database: Pick<Prisma.TransactionClient, 'user'> = getPrisma(),
) {
  if (targetRole !== 'SUPER_ADMIN') {
    return;
  }

  const superAdminCount = await database.user.count({
    where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
  });

  if (superAdminCount <= 1) {
    throw new AdminUserError(
      'The final active super administrator cannot be demoted, disabled, or deleted.',
      409,
    );
  }
}

async function assertTeacherHasNoTeachingAssignments(
  targetId: string,
  targetRole: Role,
  nextRole?: Role,
  database: Pick<Prisma.TransactionClient, 'course' | 'subject'> = getPrisma(),
) {
  if (
    targetRole !== 'TEACHER' ||
    (nextRole !== undefined && nextRole === 'TEACHER')
  ) {
    return;
  }

  const [assignedSubjectCount, ownedCourseCount] = await Promise.all([
    database.subject.count({ where: { teacherId: targetId } }),
    database.course.count({ where: { teacherId: targetId } }),
  ]);

  if (assignedSubjectCount > 0 || ownedCourseCount > 0) {
    throw new AdminUserError(
      'Reassign this teacher\'s K-12 subjects and courses before changing or disabling the account.',
      409,
    );
  }
}

async function prepareRoleBoundRecordsForChange(
  targetId: string,
  targetRole: Role,
  nextRole: Role,
  transaction: Prisma.TransactionClient,
) {
  if (targetRole === nextRole) return;

  if (targetRole === 'PARENT') {
    const parentLinkCount = await transaction.parentStudent.count({
      where: { parentId: targetId },
    });
    if (parentLinkCount) {
      throw new AdminUserError(
        'Remove this parent\'s linked students before changing the account role.',
        409,
      );
    }
  }

  if (targetRole !== 'STUDENT') return;

  const [
    enrollmentCount,
    progressCount,
    submissionCount,
    subscriptionCount,
    paymentCount,
    parentLinkCount,
  ] = await Promise.all([
    transaction.enrollment.count({ where: { studentId: targetId } }),
    transaction.lessonProgress.count({ where: { studentId: targetId } }),
    transaction.assignmentSubmission.count({ where: { studentId: targetId } }),
    transaction.studentSubscription.count({ where: { studentId: targetId } }),
    transaction.uSDManualLedger.count({ where: { studentId: targetId } }),
    transaction.parentStudent.count({ where: { studentId: targetId } }),
  ]);

  if (
    enrollmentCount ||
    progressCount ||
    submissionCount ||
    subscriptionCount ||
    paymentCount ||
    parentLinkCount
  ) {
    throw new AdminUserError(
      'Remove or resolve this student\'s enrollments, learning records, family links, and financial records before changing roles.',
      409,
    );
  }

}

async function lockSuperAdminHierarchy(transaction: Prisma.TransactionClient) {
  await transaction.$executeRawUnsafe(
    'select pg_advisory_xact_lock($1)',
    SUPER_ADMIN_ADVISORY_LOCK,
  );
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
  actorRole,
  role,
  targetId,
}: {
  actorId: string;
  actorRole: Role;
  role: Role;
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      email: true,
      gradeLevel: true,
      id: true,
      role: true,
      status: true,
      supabaseId: true,
    },
  });

  if (!target) {
    throw new AdminUserError('User not found.', 404);
  }

  const authUser = await requireExactAuthUser(
    target.supabaseId,
    target.email,
  );
  let previousRole = target.role;
  let previousGradeLevel = target.gradeLevel;
  let previousHealthScore: {
    assignmentScore: number;
    healthPercentage: number;
    id: string;
    isAtRisk: boolean;
    lastLoginAt: Date;
    videoCompletion: number;
  } | null = null;

  const updated = await prisma.$transaction(async (transaction) => {
    await lockSuperAdminHierarchy(transaction);
    const current = await transaction.user.findUnique({
      where: { id: target.id },
      select: {
        gradeLevel: true,
        healthScore: {
          select: {
            assignmentScore: true,
            healthPercentage: true,
            id: true,
            isAtRisk: true,
            lastLoginAt: true,
            videoCompletion: true,
          },
        },
        id: true,
        role: true,
      },
    });
    if (!current) throw new AdminUserError('User not found.', 404);

    if (current.id === actorId && current.role !== role) {
      throw new AdminUserError(
        'You cannot change your own administrator role.',
        403,
      );
    }

    assertActorCanManageRole(actorRole, current.role, role);
    if (current.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      await assertAnotherSuperAdminWillRemain(current.role, transaction);
    }
    await assertTeacherHasNoTeachingAssignments(
      current.id,
      current.role,
      role,
      transaction,
    );
    await prepareRoleBoundRecordsForChange(
      current.id,
      current.role,
      role,
      transaction,
    );
    previousRole = current.role;
    previousGradeLevel = current.gradeLevel;
    previousHealthScore = current.healthScore;

    if (current.role === 'STUDENT' && role !== 'STUDENT') {
      // Health is derived, but preserve the snapshot so metadata compensation
      // can restore the student exactly if Supabase rejects the role change.
      await transaction.studentHealthScore.deleteMany({
        where: { studentId: current.id },
      });
    }

    return transaction.user.update({
      where: { id: current.id },
      data: {
        role,
        ...(role === 'STUDENT' ? {} : { gradeLevel: null }),
      },
      select: { id: true, role: true },
    });
  });

  const appMetadata = authUser.app_metadata ?? {};
  const metadataNeedsUpdate = appMetadata.role !== role;

  if (metadataNeedsUpdate) {
    const { error } =
      await getSupabaseAdminClient().auth.admin.updateUserById(
        target.supabaseId,
        {
          app_metadata: { ...appMetadata, role },
        },
      );

    if (error) {
      const rollback = await prisma.$transaction(async (transaction) => {
        await lockSuperAdminHierarchy(transaction);
        const restored = await transaction.user.updateMany({
          where: { id: target.id, role },
          data: {
            gradeLevel: previousGradeLevel,
            role: previousRole,
          },
        });
        if (
          restored.count === 1 &&
          previousRole === 'STUDENT' &&
          previousHealthScore
        ) {
          await transaction.studentHealthScore.upsert({
            where: { studentId: target.id },
            create: {
              assignmentScore: previousHealthScore.assignmentScore,
              healthPercentage: previousHealthScore.healthPercentage,
              id: previousHealthScore.id,
              isAtRisk: previousHealthScore.isAtRisk,
              lastLoginAt: previousHealthScore.lastLoginAt,
              studentId: target.id,
              videoCompletion: previousHealthScore.videoCompletion,
            },
            update: {
              assignmentScore: previousHealthScore.assignmentScore,
              healthPercentage: previousHealthScore.healthPercentage,
              isAtRisk: previousHealthScore.isAtRisk,
              lastLoginAt: previousHealthScore.lastLoginAt,
              videoCompletion: previousHealthScore.videoCompletion,
            },
          });
        }
        return restored;
      });
      if (rollback.count !== 1) {
        throw new AdminUserError(
          `Supabase role synchronization failed and the account changed concurrently. Manual reconciliation is required: ${error.message}`,
          502,
        );
      }
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
  actorRole,
  status,
  targetId,
}: {
  actorId: string;
  actorRole: Role;
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

  const authUser = await requireExactAuthUser(
    target.supabaseId,
    target.email,
  );
  let previousStatus = target.status;

  const updated = await prisma.$transaction(async (transaction) => {
    await lockSuperAdminHierarchy(transaction);
    const current = await transaction.user.findUnique({
      where: { id: target.id },
      select: { id: true, role: true, status: true },
    });
    if (!current) throw new AdminUserError('User not found.', 404);

    if (current.id === actorId && status !== 'ACTIVE') {
      throw new AdminUserError('You cannot disable your own account.', 403);
    }

    assertActorCanManageRole(actorRole, current.role);
    if (current.role === 'SUPER_ADMIN' && status !== 'ACTIVE') {
      await assertAnotherSuperAdminWillRemain(current.role, transaction);
    }
    if (status !== 'ACTIVE') {
      await assertTeacherHasNoTeachingAssignments(
        current.id,
        current.role,
        undefined,
        transaction,
      );
    }
    previousStatus = current.status;

    return transaction.user.update({
      where: { id: current.id },
      data: { status },
      select: { id: true, status: true },
    });
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
    const rollback = await prisma.$transaction(async (transaction) => {
      await lockSuperAdminHierarchy(transaction);
      return transaction.user.updateMany({
        where: { id: target.id, status },
        data: { status: previousStatus },
      });
    });
    if (rollback.count !== 1) {
      throw new AdminUserError(
        `Supabase account-status synchronization failed and the account changed concurrently. Manual reconciliation is required: ${error.message}`,
        502,
      );
    }
    throw new AdminUserError(
      `Supabase account-status synchronization failed; the Prisma update was rolled back: ${error.message}`,
      502,
    );
  }

  return updated;
}
