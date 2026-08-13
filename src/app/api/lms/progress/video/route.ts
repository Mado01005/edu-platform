import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { recalculateStudentHealthScores } from '@/lib/lms/health';
import { resolvePlayableLessonVideo } from '@/lib/lms/course-player';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const MIN_CHECKPOINT_INTERVAL_MS = 2_000;

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const student = await requireLmsRole(['STUDENT']);
    let body: {
      durationMin?: unknown;
      lessonId?: unknown;
      watchPercentage?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: 'A valid JSON request body is required.' },
        { status: 400 },
      );
    }
    if (
      typeof body.lessonId !== 'string' ||
      typeof body.watchPercentage !== 'number' ||
      !Number.isFinite(body.watchPercentage) ||
      body.watchPercentage < 0 ||
      body.watchPercentage > 100 ||
      (body.durationMin !== undefined &&
        (!Number.isInteger(body.durationMin) ||
          Number(body.durationMin) < 0 ||
          Number(body.durationMin) > 10_000))
    ) {
      return NextResponse.json(
        { error: 'A valid lesson and watch percentage are required.' },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: body.lessonId,
        module: {
          course: {
            enrollments: { some: { studentId: student.id } },
          },
        },
      },
      select: {
        contentType: true,
        id: true,
        module: { select: { courseId: true } },
        videoUrl: true,
        videoUrl1080: true,
        videoUrl360: true,
        videoUrl480: true,
        videoUrl720: true,
      },
    });
    const playableVideo = lesson
      ? resolvePlayableLessonVideo({
          contentType: lesson.contentType,
          qualitySources: {
            '1080p': lesson.videoUrl1080,
            '360p': lesson.videoUrl360,
            '480p': lesson.videoUrl480,
            '720p': lesson.videoUrl720,
          },
          videoUrl: lesson.videoUrl,
        })
      : null;
    if (!lesson || !playableVideo) {
      return NextResponse.json(
        { error: 'Enrolled video lesson not found.' },
        { status: 404 },
      );
    }

    const current = await prisma.lessonProgress.findUnique({
      where: {
        studentId_lessonId: {
          lessonId: lesson.id,
          studentId: student.id,
        },
      },
      select: {
        isCompleted: true,
        updatedAt: true,
        watchPercentage: true,
      },
    });
    const requestedPercentage = Number(body.watchPercentage.toFixed(2));
    if (
      current &&
      requestedPercentage <= current.watchPercentage
    ) {
      if (current.watchPercentage >= 50) {
        const durationMin = typeof body.durationMin === 'number' ? body.durationMin : 0;
        await prisma.digitalAttendance.upsert({
          where: {
            studentId_lessonId_type: {
              lessonId: lesson.id,
              studentId: student.id,
              type: 'VIDEO_LESSON',
            },
          },
          create: {
            courseId: lesson.module.courseId,
            durationMin,
            lessonId: lesson.id,
            studentId: student.id,
            type: 'VIDEO_LESSON',
          },
          update: {},
        });
        await prisma.digitalAttendance.updateMany({
          where: {
            durationMin: { lt: durationMin },
            lessonId: lesson.id,
            studentId: student.id,
            type: 'VIDEO_LESSON',
          },
          data: { durationMin },
        });
      }
      return NextResponse.json({
        isCompleted: current.isCompleted,
        watchPercentage: current.watchPercentage,
      });
    }
    const watchPercentage = Math.max(
      current?.watchPercentage ?? 0,
      requestedPercentage,
    );
    if (watchPercentage > (current?.watchPercentage ?? 0) + 10) {
      return NextResponse.json(
        { error: 'Video progress checkpoints must be submitted in sequence.' },
        { status: 409 },
      );
    }
    if (current) {
      const elapsedMs = Date.now() - current.updatedAt.getTime();
      if (elapsedMs < MIN_CHECKPOINT_INTERVAL_MS) {
        const retryAfterMs = MIN_CHECKPOINT_INTERVAL_MS - elapsedMs;
        return NextResponse.json(
          {
            error: 'Video progress checkpoints are arriving too quickly.',
            retryAfterMs,
          },
          {
            headers: {
              'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1_000))),
            },
            status: 429,
          },
        );
      }
    }
    const isCompleted = current?.isCompleted === true || watchPercentage >= 95;

    await prisma.$transaction(async (tx) => {
      await tx.lessonProgress.upsert({
        where: {
          studentId_lessonId: {
            lessonId: lesson.id,
            studentId: student.id,
          },
        },
        create: {
          isCompleted,
          lessonId: lesson.id,
          studentId: student.id,
          watchPercentage,
        },
        update: { isCompleted, watchPercentage },
      });
      if (watchPercentage >= 50) {
        const durationMin = typeof body.durationMin === 'number' ? body.durationMin : 0;
        await tx.digitalAttendance.upsert({
          where: {
            studentId_lessonId_type: {
              lessonId: lesson.id,
              studentId: student.id,
              type: 'VIDEO_LESSON',
            },
          },
          create: {
            courseId: lesson.module.courseId,
            durationMin,
            lessonId: lesson.id,
            studentId: student.id,
            type: 'VIDEO_LESSON',
          },
          update: {},
        });
        await tx.digitalAttendance.updateMany({
          where: {
            durationMin: { lt: durationMin },
            lessonId: lesson.id,
            studentId: student.id,
            type: 'VIDEO_LESSON',
          },
          data: { durationMin },
        });
      }
    });
    await recalculateStudentHealthScores([student.id]);

    return NextResponse.json({ isCompleted, watchPercentage });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('[LMS_VIDEO_PROGRESS]', error);
    return NextResponse.json(
      { error: 'Unable to save video progress.' },
      { status: 500 },
    );
  }
}
