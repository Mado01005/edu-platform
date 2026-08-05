import 'server-only';

import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { Prisma, type GradeLevel } from '@prisma/client';
import { deliverSystemNotification } from '@/lib/lms/notifications';
import { isGradeLevel } from '@/lib/lms/k12';
import { getPrisma } from '@/lib/prisma';

const CODE_PATTERN = /^\d{12}$/;
const MAX_BATCH_SIZE = 100;

export class AccessCodeError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function secret() {
  const value = process.env.DIGITAL_CODE_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new AccessCodeError(
      'Digital access code service is not configured.',
      503,
    );
  }
  return value;
}

export function hashDigitalAccessCode(code: string) {
  return createHmac('sha256', secret()).update(code).digest('hex');
}

function normalizeCode(value: unknown) {
  if (typeof value !== 'string') {
    throw new AccessCodeError('Enter a 12-digit access code.');
  }
  const code = value.replace(/[\s-]/g, '');
  if (!CODE_PATTERN.test(code)) {
    throw new AccessCodeError('Enter a valid 12-digit access code.');
  }
  return code;
}

function batchSize(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > MAX_BATCH_SIZE) {
    throw new AccessCodeError(`Batch size must be between 1 and ${MAX_BATCH_SIZE}.`);
  }
  return Number(value);
}

function expiry(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new AccessCodeError('Expiry date is invalid.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
    throw new AccessCodeError('Expiry date must be in the future.');
  }
  return date;
}

function generateCode() {
  let value = '';
  for (let index = 0; index < 12; index += 1) {
    value += String(randomInt(index === 0 ? 1 : 0, 10));
  }
  return value;
}

export async function generateDigitalAccessCodes({
  actorId,
  count: rawCount,
  courseId,
  expiresAt,
  gradeLevel,
}: {
  actorId: string;
  count: unknown;
  courseId?: unknown;
  expiresAt?: unknown;
  gradeLevel?: unknown;
}) {
  const count = batchSize(rawCount);
  const normalizedCourseId =
    typeof courseId === 'string' && courseId.trim() ? courseId.trim() : null;
  const normalizedGrade = isGradeLevel(gradeLevel)
    ? (gradeLevel as GradeLevel)
    : null;
  if (Number(Boolean(normalizedCourseId)) + Number(Boolean(normalizedGrade)) !== 1) {
    throw new AccessCodeError('Choose exactly one course or grade target.');
  }

  const prisma = getPrisma();
  if (normalizedCourseId) {
    const course = await prisma.course.findFirst({
      where: { id: normalizedCourseId, isPublished: true },
      select: { id: true },
    });
    if (!course) throw new AccessCodeError('Published course not found.', 404);
  }

  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateCode());
  const batchId = randomUUID();
  const expiration = expiry(expiresAt);
  await prisma.digitalAccessCode.createMany({
    data: Array.from(codes, (code) => ({
      batchId,
      codeHash: hashDigitalAccessCode(code),
      codeLastFour: code.slice(-4),
      courseId: normalizedCourseId,
      createdById: actorId,
      expiresAt: expiration,
      gradeLevel: normalizedGrade,
    })),
  });

  return {
    batchId,
    codes: Array.from(codes),
    expiresAt: expiration?.toISOString() ?? null,
  };
}

export async function redeemDigitalAccessCode(studentId: string, value: unknown) {
  const code = normalizeCode(value);
  const codeHash = hashDigitalAccessCode(code);
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`select pg_advisory_xact_lock(hashtextextended(${`access-code:${codeHash}`}, 0))`,
    );
    const [accessCode, student] = await Promise.all([
      tx.digitalAccessCode.findUnique({ where: { codeHash } }),
      tx.user.findFirst({
        where: { id: studentId, role: 'STUDENT', status: 'ACTIVE' },
        select: { gradeLevel: true },
      }),
    ]);
    if (!accessCode || accessCode.status !== 'ACTIVE') {
      throw new AccessCodeError('This access code is invalid or already used.', 409);
    }
    if (accessCode.expiresAt && accessCode.expiresAt <= new Date()) {
      throw new AccessCodeError('This access code has expired.', 409);
    }
    if (!student) throw new AccessCodeError('Student account not found.', 404);
    if (accessCode.gradeLevel && student.gradeLevel !== accessCode.gradeLevel) {
      throw new AccessCodeError('This code belongs to a different grade.', 403);
    }

    const courses = await tx.course.findMany({
      where: accessCode.courseId
        ? { id: accessCode.courseId, isPublished: true }
        : {
            isPublished: true,
            subject: { grade: accessCode.gradeLevel! },
          },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        modules: {
          orderBy: { position: 'asc' },
          select: {
            lessons: {
              orderBy: { position: 'asc' },
              select: { id: true },
              take: 1,
            },
          },
        },
        title: true,
      },
    });
    if (!courses.length) {
      throw new AccessCodeError('No published course is available for this code.', 409);
    }

    const claimed = await tx.digitalAccessCode.updateMany({
      where: { id: accessCode.id, status: 'ACTIVE', redeemedAt: null },
      data: { redeemedAt: new Date(), redeemedById: studentId, status: 'REDEEMED' },
    });
    if (claimed.count !== 1) {
      throw new AccessCodeError('This access code is already used.', 409);
    }
    await tx.enrollment.createMany({
      data: courses.map((course) => ({ courseId: course.id, studentId })),
      skipDuplicates: true,
    });
    const lessonId = courses[0]?.modules.flatMap((module) => module.lessons)[0]?.id;
    return {
      courseCount: courses.length,
      courseTitle: courses[0]!.title,
      launchUrl: lessonId
        ? `/courses/${courses[0]!.id}/learn/lessons/${lessonId}`
        : '/dashboard',
    };
  });

  try {
    await deliverSystemNotification({
      broadcast: false,
      includeParents: true,
      message:
        result.courseCount === 1
          ? `${result.courseTitle} is ready to learn.`
          : `${result.courseCount} grade courses are ready to learn.`,
      studentId,
      title: 'Digital access activated',
      type: 'ANNOUNCEMENT',
      url: result.launchUrl,
      userIds: [],
    });
  } catch (error) {
    console.error('[ACCESS_CODE_NOTIFICATION]', error);
  }
  return result;
}
