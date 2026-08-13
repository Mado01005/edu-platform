import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma, type GradeLevel } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

export const STUDENT_HEALTH_THRESHOLD = 70;
const ACTIVITY_WINDOW_DAYS = 30;
const ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const VIDEO_TYPES = ['VIMEO', 'YOUTUBE', 'R2_VIDEO'] as const;
const HEALTH_REFRESH_BATCH_SIZE = 100;
const HEALTH_REFRESH_JOB_NAME = 'student-health-daily';

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function calculateActivityScore(
  lastActiveAt: Date,
  now = new Date(),
) {
  const elapsedDays = Math.max(
    0,
    (now.getTime() - lastActiveAt.getTime()) / 86_400_000,
  );

  return clampPercentage(
    100 - (elapsedDays / ACTIVITY_WINDOW_DAYS) * 100,
  );
}

export function isHealthAtRisk(healthPercentage: number) {
  return healthPercentage < STUDENT_HEALTH_THRESHOLD;
}

export function calculateStudentHealth({
  assignmentCompletion,
  lastActiveAt,
  now = new Date(),
  videoCompletion,
}: {
  assignmentCompletion: number;
  lastActiveAt: Date;
  now?: Date;
  videoCompletion: number;
}) {
  const activityScore = calculateActivityScore(lastActiveAt, now);
  const normalizedVideo = clampPercentage(videoCompletion);
  const normalizedAssignments = clampPercentage(assignmentCompletion);
  const healthPercentage = Number(
    (
      activityScore * 0.3 +
      normalizedVideo * 0.4 +
      normalizedAssignments * 0.3
    ).toFixed(2),
  );

  return {
    activityScore: Number(activityScore.toFixed(2)),
    assignmentScore: Number(normalizedAssignments.toFixed(2)),
    healthPercentage,
    isAtRisk: isHealthAtRisk(healthPercentage),
    videoCompletion: Number(normalizedVideo.toFixed(2)),
  };
}

export type StudentHealthRadarRecord = {
  assignmentScore: number;
  gradeLevel: GradeLevel | null;
  healthPercentage: number;
  id: string;
  isAtRisk: boolean;
  lastLoginAt: Date;
  name: string | null;
  phoneNumber: string | null;
  videoCompletion: number;
};

export type StudentHealthRadarStatus = 'ALL' | 'AT_RISK' | 'HEALTHY';

export type StudentHealthRadarPage = {
  atRiskCount: number;
  filteredCount: number;
  healthyCount: number;
  page: number;
  pageCount: number;
  students: StudentHealthRadarRecord[];
  totalStudents: number;
};

export async function recordStudentActivity(
  studentId: string,
  now = new Date(),
) {
  const prisma = getPrisma();
  const current = await prisma.studentHealthScore.findUnique({
    where: { studentId },
    select: {
      assignmentScore: true,
      lastLoginAt: true,
      videoCompletion: true,
    },
  });

  if (!current) {
    await recalculateStudentHealthScores([studentId], now);
    return;
  }

  if (
    current &&
    now.getTime() - current.lastLoginAt.getTime() <
      ACTIVITY_TOUCH_INTERVAL_MS
  ) {
    return;
  }

  const score = calculateStudentHealth({
    assignmentCompletion: current?.assignmentScore ?? 0,
    lastActiveAt: now,
    now,
    videoCompletion: current?.videoCompletion ?? 0,
  });

  await prisma.studentHealthScore.upsert({
    where: { studentId },
    create: {
      studentId,
      assignmentScore: score.assignmentScore,
      healthPercentage: score.healthPercentage,
      isAtRisk: score.isAtRisk,
      lastLoginAt: now,
      videoCompletion: score.videoCompletion,
    },
    update: {
      healthPercentage: score.healthPercentage,
      isAtRisk: score.isAtRisk,
      lastLoginAt: now,
    },
  });
}

export async function getStudentHealthRadarPage({
  gradeLevel = null,
  page = 1,
  pageSize = 50,
  query = '',
  status = 'ALL',
  now = new Date(),
}: {
  gradeLevel?: GradeLevel | 'UNASSIGNED' | null;
  now?: Date;
  page?: number;
  pageSize?: number;
  query?: string;
  status?: StudentHealthRadarStatus;
} = {}): Promise<StudentHealthRadarPage> {
  const prisma = getPrisma();
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const normalizedQuery = query.trim().slice(0, 160);
  const baseWhere = {
    role: 'STUDENT',
    status: 'ACTIVE',
  } satisfies Prisma.UserWhereInput;
  const filters: Prisma.UserWhereInput[] = [];

  if (gradeLevel === 'UNASSIGNED') filters.push({ gradeLevel: null });
  else if (gradeLevel) filters.push({ gradeLevel });
  if (normalizedQuery) {
    filters.push({
      OR: [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { phoneNumber: { contains: normalizedQuery, mode: 'insensitive' } },
      ],
    });
  }
  if (status === 'AT_RISK') {
    filters.push({ healthScore: { is: { isAtRisk: true } } });
  } else if (status === 'HEALTHY') {
    filters.push({
      OR: [
        { healthScore: { is: { isAtRisk: false } } },
        { healthScore: { is: null } },
      ],
    });
  }

  const where = {
    ...baseWhere,
    ...(filters.length ? { AND: filters } : {}),
  } satisfies Prisma.UserWhereInput;
  const [totalStudents, atRiskCount, filteredCount] = await Promise.all([
    prisma.user.count({ where: baseWhere }),
    prisma.user.count({
      where: {
        ...baseWhere,
        healthScore: { is: { isAtRisk: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredCount / safePageSize));
  const safePage = Math.min(pageCount, Math.max(1, Math.floor(page)));
  const students = await prisma.user.findMany({
    where,
    orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: {
      createdAt: true,
      gradeLevel: true,
      healthScore: {
        select: {
          assignmentScore: true,
          lastLoginAt: true,
          videoCompletion: true,
        },
      },
      id: true,
      name: true,
      phoneNumber: true,
    },
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  });

  return {
    atRiskCount,
    filteredCount,
    healthyCount: totalStudents - atRiskCount,
    page: safePage,
    pageCount,
    students: students.map((student) => {
      const lastLoginAt =
        student.healthScore?.lastLoginAt ?? student.createdAt;
      const score = calculateStudentHealth({
        assignmentCompletion: student.healthScore?.assignmentScore ?? 100,
        lastActiveAt: lastLoginAt,
        now,
        videoCompletion: student.healthScore?.videoCompletion ?? 100,
      });

      return {
        assignmentScore: score.assignmentScore,
        gradeLevel: student.gradeLevel,
        healthPercentage: score.healthPercentage,
        id: student.id,
        isAtRisk: score.isAtRisk,
        lastLoginAt,
        name: student.name,
        phoneNumber: student.phoneNumber,
        videoCompletion: score.videoCompletion,
      };
    }),
    totalStudents,
  };
}

export async function recalculateStudentHealthScores(
  requestedStudentIds: readonly string[],
  now = new Date(),
): Promise<StudentHealthRadarRecord[]> {
  const prisma = getPrisma();
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      status: 'ACTIVE',
      id: { in: [...new Set(requestedStudentIds)] },
    },
    select: {
      createdAt: true,
      gradeLevel: true,
      healthScore: {
        select: { lastLoginAt: true },
      },
      id: true,
      name: true,
      phoneNumber: true,
    },
    orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  });

  if (!students.length) return [];

  const studentIds = students.map(({ id }) => id);
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: studentIds } },
    select: {
      course: {
        select: {
          assignments: { select: { id: true } },
          modules: {
            select: {
              lessons: {
                where: { contentType: { in: [...VIDEO_TYPES] } },
                select: { id: true },
              },
            },
          },
        },
      },
      studentId: true,
    },
  });

  const videoLessonIdsByStudent = new Map<string, Set<string>>();
  const assignmentIdsByStudent = new Map<string, Set<string>>();

  for (const enrollment of enrollments) {
    const videoIds =
      videoLessonIdsByStudent.get(enrollment.studentId) ?? new Set<string>();
    const assignmentIds =
      assignmentIdsByStudent.get(enrollment.studentId) ?? new Set<string>();

    for (const courseModule of enrollment.course.modules) {
      for (const lesson of courseModule.lessons) videoIds.add(lesson.id);
    }
    for (const assignment of enrollment.course.assignments) {
      assignmentIds.add(assignment.id);
    }

    videoLessonIdsByStudent.set(enrollment.studentId, videoIds);
    assignmentIdsByStudent.set(enrollment.studentId, assignmentIds);
  }

  const allVideoLessonIds = [
    ...new Set(
      [...videoLessonIdsByStudent.values()].flatMap((ids) => [...ids]),
    ),
  ];
  const allAssignmentIds = [
    ...new Set(
      [...assignmentIdsByStudent.values()].flatMap((ids) => [...ids]),
    ),
  ];

  const [progressRows, submissionRows] = await Promise.all([
    allVideoLessonIds.length
      ? prisma.lessonProgress.findMany({
          where: {
            lessonId: { in: allVideoLessonIds },
            studentId: { in: studentIds },
          },
          select: {
            isCompleted: true,
            lessonId: true,
            studentId: true,
            watchPercentage: true,
          },
        })
      : [],
    allAssignmentIds.length
      ? prisma.assignmentSubmission.findMany({
          where: {
            assignmentId: { in: allAssignmentIds },
            studentId: { in: studentIds },
          },
          select: { assignmentId: true, studentId: true },
        })
      : [],
  ]);

  const progressByStudentAndLesson = new Map<string, number>();
  for (const progress of progressRows) {
    progressByStudentAndLesson.set(
      `${progress.studentId}:${progress.lessonId}`,
      progress.isCompleted
        ? 100
        : clampPercentage(progress.watchPercentage),
    );
  }

  const submittedByStudent = new Map<string, Set<string>>();
  for (const submission of submissionRows) {
    const submitted =
      submittedByStudent.get(submission.studentId) ?? new Set<string>();
    submitted.add(submission.assignmentId);
    submittedByStudent.set(submission.studentId, submitted);
  }

  const records = students.map((student) => {
    const videoLessonIds = videoLessonIdsByStudent.get(student.id) ?? new Set();
    const assignmentIds = assignmentIdsByStudent.get(student.id) ?? new Set();
    const submitted = submittedByStudent.get(student.id) ?? new Set();
    const videoCompletion = videoLessonIds.size
      ? [...videoLessonIds].reduce(
          (total, lessonId) =>
            total +
            (progressByStudentAndLesson.get(`${student.id}:${lessonId}`) ?? 0),
          0,
        ) / videoLessonIds.size
      : 100;
    const assignmentCompletion = assignmentIds.size
      ? ([...assignmentIds].filter((assignmentId) =>
          submitted.has(assignmentId),
        ).length /
          assignmentIds.size) *
        100
      : 100;
    const lastLoginAt = student.healthScore?.lastLoginAt ?? student.createdAt;
    const score = calculateStudentHealth({
      assignmentCompletion,
      lastActiveAt: lastLoginAt,
      now,
      videoCompletion,
    });

    return {
      assignmentScore: score.assignmentScore,
      gradeLevel: student.gradeLevel,
      healthPercentage: score.healthPercentage,
      id: student.id,
      isAtRisk: score.isAtRisk,
      lastLoginAt,
      name: student.name,
      phoneNumber: student.phoneNumber,
      videoCompletion: score.videoCompletion,
    };
  });

  for (let offset = 0; offset < records.length; offset += 100) {
    const batch = records.slice(offset, offset + 100);
    await prisma.$transaction(
      batch.map((record) =>
        prisma.studentHealthScore.upsert({
          where: { studentId: record.id },
          create: {
            assignmentScore: record.assignmentScore,
            healthPercentage: record.healthPercentage,
            isAtRisk: record.isAtRisk,
            lastLoginAt: record.lastLoginAt,
            studentId: record.id,
            videoCompletion: record.videoCompletion,
          },
          update: {
            assignmentScore: record.assignmentScore,
            healthPercentage: record.healthPercentage,
            isAtRisk: record.isAtRisk,
            videoCompletion: record.videoCompletion,
          },
        }),
      ),
    );
  }

  return records;
}

export type StudentHealthRefreshSummary = {
  atRisk: number;
  batches: number;
  processed: number;
  skipped: boolean;
};

async function recalculateAllStudentHealthScores(
  now = new Date(),
): Promise<Omit<StudentHealthRefreshSummary, 'skipped'>> {
  const prisma = getPrisma();
  let afterId: string | undefined;
  let atRisk = 0;
  let batches = 0;
  let processed = 0;

  for (;;) {
    const students = await prisma.user.findMany({
      where: {
        id: afterId ? { gt: afterId } : undefined,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      orderBy: { id: 'asc' },
      select: { id: true },
      take: HEALTH_REFRESH_BATCH_SIZE,
    });
    if (!students.length) break;

    const records = await recalculateStudentHealthScores(
      students.map(({ id }) => id),
      now,
    );
    processed += records.length;
    atRisk += records.filter(({ isAtRisk }) => isAtRisk).length;
    batches += 1;
    afterId = students.at(-1)?.id;

    if (students.length < HEALTH_REFRESH_BATCH_SIZE) break;
  }

  return { atRisk, batches, processed };
}

export async function refreshAllStudentHealthScores(
  now = new Date(),
): Promise<StudentHealthRefreshSummary> {
  const prisma = getPrisma();
  const ownerToken = randomUUID();
  const acquired = await prisma.$queryRaw<{ owner_token: string }[]>(
    Prisma.sql`
      insert into public.lms_system_job_leases (
        name,
        owner_token,
        locked_until,
        updated_at
      )
      values (
        ${HEALTH_REFRESH_JOB_NAME},
        ${ownerToken},
        current_timestamp + interval '10 minutes',
        current_timestamp
      )
      on conflict (name) do update
      set
        owner_token = excluded.owner_token,
        locked_until = excluded.locked_until,
        updated_at = current_timestamp
      where public.lms_system_job_leases.locked_until <= current_timestamp
      returning owner_token
    `,
  );

  if (acquired[0]?.owner_token !== ownerToken) {
    return { atRisk: 0, batches: 0, processed: 0, skipped: true };
  }

  try {
    return {
      ...(await recalculateAllStudentHealthScores(now)),
      skipped: false,
    };
  } finally {
    try {
      await prisma.$executeRaw(
        Prisma.sql`
          update public.lms_system_job_leases
          set locked_until = current_timestamp, updated_at = current_timestamp
          where name = ${HEALTH_REFRESH_JOB_NAME}
            and owner_token = ${ownerToken}
        `,
      );
    } catch (error) {
      console.error('[STUDENT_HEALTH_LEASE_RELEASE]', error);
    }
  }
}
