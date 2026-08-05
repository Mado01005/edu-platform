import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({
  path: fileURLToPath(new URL('../.env.local', import.meta.url)),
  quiet: true,
});

const EXPECTED_TABLES = [
  'lms_assignment_submissions',
  'lms_assignments',
  'lms_parent_students',
  'lms_student_health_scores',
  'lms_student_subscriptions',
  'lms_subjects',
  'lms_system_job_leases',
  'lms_system_notifications',
  'lms_usd_manual_ledger',
  'lms_web_push_subscriptions',
] as const;

const EXPECTED_ROLE_LOCK_TRIGGERS = [
  'lock_lms_enrollment_student_role',
  'lock_lms_health_student_role',
  'lock_lms_parent_student_roles',
  'lock_lms_payment_roles',
  'lock_lms_progress_student_role',
  'lock_lms_subject_teacher_role',
  'lock_lms_submission_student_role',
  'lock_lms_subscription_roles',
] as const;

class RollbackVerification extends Error {
  constructor(
    readonly result: { isAtRisk: boolean; tested: boolean },
  ) {
    super('Rollback the health-score verification transaction.');
  }
}

async function verifyHealthRiskTrigger(prisma: PrismaClient) {
  try {
    await prisma.$transaction(async (transaction) => {
      const student = await transaction.user.findFirst({
        where: { role: 'STUDENT', status: 'ACTIVE' },
        select: { id: true },
      });

      if (!student) {
        throw new RollbackVerification({ isAtRisk: false, tested: false });
      }

      await transaction.studentHealthScore.upsert({
        where: { studentId: student.id },
        create: {
          assignmentScore: 69.99,
          healthPercentage: 69.99,
          isAtRisk: false,
          lastLoginAt: new Date(),
          studentId: student.id,
          videoCompletion: 69.99,
        },
        update: { healthPercentage: 69.99, isAtRisk: false },
      });
      const score = await transaction.studentHealthScore.findUniqueOrThrow({
        where: { studentId: student.id },
        select: { isAtRisk: true },
      });

      throw new RollbackVerification({
        isAtRisk: score.isAtRisk,
        tested: true,
      });
    });
  } catch (error) {
    if (error instanceof RollbackVerification) return error.result;
    throw error;
  }

  throw new Error('The health-score verification did not roll back.');
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const [
      activeSuperAdmins,
      tableRows,
      erpPrivileges,
      roleLockTriggers,
      progressWritePrivileges,
      badBackfill,
    ] = await Promise.all([
        prisma.user.count({
          where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
        }),
        prisma.$queryRaw<{ rls_enabled: boolean; table_name: string }[]>(
          Prisma.sql`
            select c.relname as table_name, c.relrowsecurity as rls_enabled
            from pg_catalog.pg_class as c
            join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
            where n.nspname = 'public'
              and c.relname in (${Prisma.join(EXPECTED_TABLES)})
          `,
        ),
        prisma.$queryRaw<
          { anon_has_access: boolean; authenticated_has_access: boolean; table_name: string }[]
        >(
          Prisma.sql`
            select
              c.relname as table_name,
              (
                has_table_privilege('anon', c.oid, 'SELECT')
                or has_table_privilege('anon', c.oid, 'INSERT')
                or has_table_privilege('anon', c.oid, 'UPDATE')
                or has_table_privilege('anon', c.oid, 'DELETE')
              ) as anon_has_access,
              (
                has_table_privilege('authenticated', c.oid, 'SELECT')
                or has_table_privilege('authenticated', c.oid, 'INSERT')
                or has_table_privilege('authenticated', c.oid, 'UPDATE')
                or has_table_privilege('authenticated', c.oid, 'DELETE')
              ) as authenticated_has_access
            from pg_catalog.pg_class as c
            join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
            where n.nspname = 'public'
              and c.relname in (${Prisma.join(EXPECTED_TABLES)})
          `,
        ),
        prisma.$queryRaw<{ trigger_name: string }[]>(
          Prisma.sql`
            select t.tgname as trigger_name
            from pg_catalog.pg_trigger as t
            where not t.tgisinternal
              and t.tgenabled <> 'D'
              and t.tgname in (${Prisma.join(EXPECTED_ROLE_LOCK_TRIGGERS)})
          `,
        ),
        prisma.$queryRaw<
          { can_delete: boolean; can_insert: boolean; can_update: boolean }[]
        >`
          select
            has_table_privilege(
              'authenticated',
              'public.lms_lesson_progress',
              'DELETE'
            ) as can_delete,
            has_table_privilege(
              'authenticated',
              'public.lms_lesson_progress',
              'INSERT'
            ) as can_insert,
            has_table_privilege(
              'authenticated',
              'public.lms_lesson_progress',
              'UPDATE'
            ) as can_update
        `,
        prisma.lessonProgress.count({
          where: { isCompleted: true, watchPercentage: { lt: 100 } },
        }),
      ]);

    assert.ok(activeSuperAdmins >= 1, 'No active SUPER_ADMIN exists.');
    assert.equal(tableRows.length, EXPECTED_TABLES.length);
    assert.ok(tableRows.every(({ rls_enabled }) => rls_enabled));
    assert.equal(erpPrivileges.length, EXPECTED_TABLES.length);
    assert.ok(
      erpPrivileges.every(
        ({ anon_has_access, authenticated_has_access }) =>
          !anon_has_access && !authenticated_has_access,
      ),
    );
    assert.equal(roleLockTriggers.length, EXPECTED_ROLE_LOCK_TRIGGERS.length);
    assert.deepEqual(progressWritePrivileges[0], {
      can_delete: false,
      can_insert: false,
      can_update: false,
    });
    assert.equal(badBackfill, 0);

    const healthTrigger = await verifyHealthRiskTrigger(prisma);
    if (healthTrigger.tested) {
      assert.equal(healthTrigger.isAtRisk, true);
    }

    console.log('ERP database verification passed.');
    console.log(`Protected ERP tables with RLS: ${tableRows.length}.`);
    console.log(`Enabled role-invariant locks: ${roleLockTriggers.length}.`);
    console.log(`Active super administrators: ${activeSuperAdmins}.`);
    console.log(
      healthTrigger.tested
        ? 'The database trigger flags 69.99% as At-Risk and the test write was rolled back.'
        : 'No active student was available for the rolled-back At-Risk trigger check.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERP database verification failed: ${message}`);
  process.exitCode = 1;
});
