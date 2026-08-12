import { PrismaClient, type Prisma } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const prisma = new PrismaClient();

type DeletedRows = {
  deleted: number;
  table: string;
};

type PreservedCounts = {
  authUsers: number;
  lmsUsers: number;
  roleAssignments: number;
  sessions: number;
};

const CONTENT_TABLES = [
  'activity_logs',
  'announcements',
  'content_items',
  'lessons',
  'live_sessions',
  'lms_assignment_submissions',
  'lms_assignments',
  'lms_course_materials',
  'lms_courses',
  'lms_digital_attendance',
  'lms_discussions',
  'lms_enrollments',
  'lms_lesson_progress',
  'lms_lessons',
  'lms_modules',
  'lms_online_payment_submissions',
  'lms_student_health_scores',
  'lms_student_subscriptions',
  'lms_subjects',
  'lms_system_notifications',
  'lms_zoom_sessions',
  'messages',
  'subjects',
  'user_achievements',
  'user_snippets',
] as const;

function integerCount(value: bigint | number) {
  return typeof value === 'bigint' ? Number(value) : value;
}

async function readPreservedCounts(
  client: Prisma.TransactionClient | PrismaClient,
): Promise<PreservedCounts> {
  const [lmsUsers, roleAssignments, sessions, authRows] = await Promise.all([
    client.user.count(),
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM public.user_roles
    `,
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM public.sessions
    `,
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM auth.users
    `,
  ]);

  return {
    authUsers: integerCount(authRows[0]?.count ?? 0),
    lmsUsers,
    roleAssignments: integerCount(roleAssignments[0]?.count ?? 0),
    sessions: integerCount(sessions[0]?.count ?? 0),
  };
}

async function countContentRows(
  client: Prisma.TransactionClient | PrismaClient,
) {
  const counts: Record<(typeof CONTENT_TABLES)[number], number> =
    Object.create(null) as Record<(typeof CONTENT_TABLES)[number], number>;

  for (const table of CONTENT_TABLES) {
    const rows = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM public.${table}`,
    );
    counts[table] = integerCount(rows[0]?.count ?? 0);
  }

  return counts;
}

async function main() {
  console.info('Purging mock content and test activity...');

  const beforePreserved = await readPreservedCounts(prisma);
  const beforeContent = await countContentRows(prisma);
  console.info('Rows scheduled for deletion:', beforeContent);
  console.info('Protected identity records:', beforePreserved);

  const deleted = await prisma.$transaction(
    async (transaction) => {
      const results: DeletedRows[] = [];
      const record = (table: string, deletedRows: number) => {
        results.push({ deleted: deletedRows, table });
      };

      // Course and lesson dependencies must be removed before their parents.
      record(
        'lms_assignment_submissions',
        (await transaction.assignmentSubmission.deleteMany()).count,
      );
      record(
        'lms_course_materials',
        (await transaction.courseMaterial.deleteMany()).count,
      );
      record(
        'lms_digital_attendance',
        (await transaction.digitalAttendance.deleteMany()).count,
      );
      record(
        'lms_discussions',
        (await transaction.discussion.deleteMany()).count,
      );
      record(
        'lms_lesson_progress',
        (await transaction.lessonProgress.deleteMany()).count,
      );
      record('lms_assignments', (await transaction.assignment.deleteMany()).count);
      record(
        'lms_zoom_sessions',
        (await transaction.zoomSession.deleteMany()).count,
      );
      record('lms_enrollments', (await transaction.enrollment.deleteMany()).count);
      record(
        'lms_online_payment_submissions',
        (await transaction.onlinePaymentSubmission.deleteMany()).count,
      );
      record(
        'lms_student_subscriptions',
        (await transaction.studentSubscription.deleteMany()).count,
      );
      record('lms_lessons', (await transaction.lesson.deleteMany()).count);
      record('lms_modules', (await transaction.module.deleteMany()).count);
      record('lms_courses', (await transaction.course.deleteMany()).count);
      record('lms_subjects', (await transaction.subject.deleteMany()).count);
      record(
        'lms_student_health_scores',
        (await transaction.studentHealthScore.deleteMany()).count,
      );
      record(
        'lms_system_notifications',
        (await transaction.systemNotification.deleteMany()).count,
      );

      // The original portal stores its own subjects, lessons, and admin feed.
      // Clear those test records as part of the same database transaction.
      record(
        'content_items',
        await transaction.$executeRaw`DELETE FROM public.content_items`,
      );
      record('lessons', await transaction.$executeRaw`DELETE FROM public.lessons`);
      record('subjects', await transaction.$executeRaw`DELETE FROM public.subjects`);
      record(
        'announcements',
        await transaction.$executeRaw`DELETE FROM public.announcements`,
      );
      record(
        'activity_logs',
        await transaction.$executeRaw`DELETE FROM public.activity_logs`,
      );
      record(
        'live_sessions',
        await transaction.$executeRaw`DELETE FROM public.live_sessions`,
      );
      record('messages', await transaction.$executeRaw`DELETE FROM public.messages`);
      record(
        'user_achievements',
        await transaction.$executeRaw`DELETE FROM public.user_achievements`,
      );
      record(
        'user_snippets',
        await transaction.$executeRaw`DELETE FROM public.user_snippets`,
      );

      const afterPreserved = await readPreservedCounts(transaction);
      if (JSON.stringify(afterPreserved) !== JSON.stringify(beforePreserved)) {
        throw new Error(
          'Protected user, role, or session counts changed; rolling back the purge.',
        );
      }

      return results;
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  const remainingContent = await countContentRows(prisma);
  const nonEmptyTables = Object.entries(remainingContent).filter(
    ([, count]) => count !== 0,
  );
  if (nonEmptyTables.length) {
    throw new Error(
      `Purge verification failed: ${nonEmptyTables
        .map(([table, count]) => `${table}=${count}`)
        .join(', ')}`,
    );
  }

  console.info(
    'Database content reset complete:',
    deleted.filter(({ deleted: count }) => count > 0),
  );
  console.info('Protected identity records preserved:', beforePreserved);
}

main()
  .catch((error: unknown) => {
    console.error('Database content reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
