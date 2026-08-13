import 'server-only';

import type {
  AccountStatus,
  GradeLevel,
  Prisma,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getPrisma } from '@/lib/prisma';
import { isGradeLevel } from '@/lib/lms/k12';
import { normalizePhoneNumber } from '@/lib/phone';
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

const EDITABLE_SUBSCRIPTION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const satisfies readonly SubscriptionStatus[];

function readName(value: unknown) {
  if (typeof value !== 'string') {
    throw new AdminUserError('Student name is required.');
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 100) {
    throw new AdminUserError('Student name must be between 2 and 100 characters.');
  }
  return name;
}

function readPhoneNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new AdminUserError('Phone number must be text.');
  }
  const phoneNumber = normalizePhoneNumber(value);
  if (!phoneNumber) {
    throw new AdminUserError('Enter a valid international phone number.');
  }
  return phoneNumber;
}

export function readAdminProfileUpdate(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new AdminUserError('A valid profile update is required.');
  }
  const targetId = Reflect.get(value, 'targetId');
  const gradeLevel = Reflect.get(value, 'gradeLevel');
  if (
    typeof targetId !== 'string' ||
    targetId.length < 1 ||
    targetId.length > 128
  ) {
    throw new AdminUserError('A valid target account is required.');
  }
  if (gradeLevel !== null && !isGradeLevel(gradeLevel)) {
    throw new AdminUserError('Choose a valid grade level.');
  }
  return {
    gradeLevel: gradeLevel as GradeLevel | null,
    name: readName(Reflect.get(value, 'name')),
    phoneNumber: readPhoneNumber(Reflect.get(value, 'phoneNumber')),
    targetId,
  };
}

export type AdminCourseAccessUpdate = {
  courseId: string;
  hasAccess: boolean;
  paymentStatus: SubscriptionStatus | null;
};

export function readAdminCourseAccessUpdate(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new AdminUserError('A valid course access update is required.');
  }
  const targetId = Reflect.get(value, 'targetId');
  const courses = Reflect.get(value, 'courses');
  if (
    typeof targetId !== 'string' ||
    targetId.length < 1 ||
    targetId.length > 128
  ) {
    throw new AdminUserError('A valid target account is required.');
  }
  if (!Array.isArray(courses) || courses.length > 250) {
    throw new AdminUserError('Choose a valid course access list.');
  }
  const parsed: AdminCourseAccessUpdate[] = courses.map((course) => {
    const courseId = course && typeof course === 'object'
      ? Reflect.get(course, 'courseId')
      : null;
    const hasAccess = course && typeof course === 'object'
      ? Reflect.get(course, 'hasAccess')
      : null;
    const paymentStatus = course && typeof course === 'object'
      ? Reflect.get(course, 'paymentStatus')
      : null;
    if (
      typeof courseId !== 'string' ||
      courseId.length < 1 ||
      courseId.length > 128 ||
      typeof hasAccess !== 'boolean' ||
      (paymentStatus !== null &&
        !EDITABLE_SUBSCRIPTION_STATUSES.includes(
          paymentStatus as SubscriptionStatus,
        ))
    ) {
      throw new AdminUserError('Choose valid course access and payment values.');
    }
    return {
      courseId,
      hasAccess,
      paymentStatus: paymentStatus as SubscriptionStatus | null,
    };
  });
  if (new Set(parsed.map(({ courseId }) => courseId)).size !== parsed.length) {
    throw new AdminUserError('Each course can only be updated once.');
  }
  return { courses: parsed, targetId };
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

export async function updateLmsUserProfile({
  actorRole,
  gradeLevel,
  name,
  phoneNumber,
  targetId,
}: {
  actorRole: Role;
  gradeLevel: GradeLevel | null;
  name: string;
  phoneNumber: string | null;
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      email: true,
      gradeLevel: true,
      id: true,
      name: true,
      phoneNumber: true,
      phoneVerified: true,
      role: true,
      supabaseId: true,
    },
  });
  if (!target) throw new AdminUserError('User not found.', 404);
  assertActorCanManageRole(actorRole, target.role);
  const authUser = await requireExactAuthUser(target.supabaseId, target.email);
  const nextGradeLevel = target.role === 'STUDENT' ? gradeLevel : null;

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        gradeLevel: nextGradeLevel,
        name,
        phoneNumber,
        phoneVerified:
          phoneNumber === target.phoneNumber ? target.phoneVerified : false,
      },
      select: {
        gradeLevel: true,
        id: true,
        name: true,
        phoneNumber: true,
        phoneVerified: true,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      Reflect.get(error, 'code') === 'P2002'
    ) {
      throw new AdminUserError(
        'That phone number is already linked to another account.',
        409,
      );
    }
    throw error;
  }

  const { error: authError } =
    await getSupabaseAdminClient().auth.admin.updateUserById(
      target.supabaseId,
      {
        user_metadata: {
          ...(authUser.user_metadata ?? {}),
          full_name: name,
          name,
          phone_number: phoneNumber,
        },
      },
    );
  if (authError) {
    await prisma.user.update({
      where: { id: target.id },
      data: {
        gradeLevel: target.gradeLevel,
        name: target.name,
        phoneNumber: target.phoneNumber,
        phoneVerified: target.phoneVerified,
      },
    });
    throw new AdminUserError(
      `Unable to synchronize the account profile: ${authError.message}`,
      502,
    );
  }
  return updated;
}

export async function updateStudentCourseAccess({
  actorId,
  actorRole,
  courses,
  targetId,
}: {
  actorId: string;
  actorRole: Role;
  courses: AdminCourseAccessUpdate[];
  targetId: string;
}) {
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) throw new AdminUserError('User not found.', 404);
  assertActorCanManageRole(actorRole, target.role);
  if (target.role !== 'STUDENT') {
    throw new AdminUserError('Course access is available for students only.');
  }

  const existingCourses = courses.length
    ? await prisma.course.findMany({
        where: { id: { in: courses.map(({ courseId }) => courseId) } },
        select: { id: true },
      })
    : [];
  if (existingCourses.length !== courses.length) {
    throw new AdminUserError('One or more selected courses no longer exist.', 409);
  }

  await prisma.$transaction(async (transaction) => {
    for (const course of courses) {
      if (course.hasAccess) {
        await transaction.enrollment.upsert({
          where: {
            studentId_courseId: { courseId: course.courseId, studentId: target.id },
          },
          create: { courseId: course.courseId, studentId: target.id },
          update: {},
        });
      } else {
        await transaction.enrollment.deleteMany({
          where: { courseId: course.courseId, studentId: target.id },
        });
      }

      if (course.paymentStatus) {
        const approved = course.paymentStatus === 'APPROVED';
        await transaction.studentSubscription.upsert({
          where: {
            studentId_courseId: { courseId: course.courseId, studentId: target.id },
          },
          create: {
            approvedAt: approved ? new Date() : null,
            approvedById: approved ? actorId : null,
            courseId: course.courseId,
            status: course.paymentStatus,
            studentId: target.id,
          },
          update: {
            approvedAt: approved ? new Date() : null,
            approvedById: approved ? actorId : null,
            status: course.paymentStatus,
          },
        });
      }
    }
  });

  const [enrollments, subscriptions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: target.id },
      select: { courseId: true },
    }),
    prisma.studentSubscription.findMany({
      where: { studentId: target.id },
      select: { courseId: true, status: true },
    }),
  ]);
  return {
    enrolledCourseIds: enrollments.map(({ courseId }) => courseId),
    subscriptions,
  };
}
