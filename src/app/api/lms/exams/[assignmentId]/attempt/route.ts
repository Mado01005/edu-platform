import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { recalculateStudentHealthScores } from '@/lib/lms/health';
import { getPrisma } from '@/lib/prisma';

type ExamOption = { key: string; text: string };

function options(value: unknown): ExamOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ExamOption =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ExamOption).key === 'string' &&
      typeof (item as ExamOption).text === 'string',
  );
}

function shuffle<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

async function accessibleExam(studentId: string, assignmentId: string) {
  return getPrisma().assignment.findFirst({
    where: {
      id: assignmentId,
      type: 'QUIZ',
      course: {
        isPublished: true,
        OR: [
          { enrollments: { some: { studentId } } },
          { modules: { some: { chapterAccess: { some: { studentId } } } } },
        ],
      },
    },
    include: { questions: { orderBy: { position: 'asc' } } },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const [{ assignmentId }, student] = await Promise.all([
      params,
      requireLmsRole(['STUDENT']),
    ]);
    const assignment = await accessibleExam(student.id, assignmentId);
    if (!assignment || !assignment.questions.length) {
      return NextResponse.json({ error: 'This exam is not available.' }, { status: 404 });
    }
    if (assignment.dueAt && assignment.dueAt < new Date()) {
      return NextResponse.json({ error: 'The exam deadline has passed.' }, { status: 409 });
    }

    const previousAttempts = await getPrisma().examAttempt.findMany({
      where: { assignmentId, studentId: student.id },
      orderBy: { attemptNumber: 'desc' },
    });
    const openAttempt = previousAttempts.find((attempt) => !attempt.submittedAt);
    let attempt = openAttempt;
    if (!attempt) {
      if (previousAttempts.length >= assignment.maxAttempts) {
        return NextResponse.json({ error: 'No retake attempts remain.' }, { status: 409 });
      }
      const questionOrder = shuffle(assignment.questions.map((question) => question.id));
      const answerOrder = Object.fromEntries(
        assignment.questions.map((question) => [
          question.id,
          shuffle(options(question.options).map((option) => option.key)),
        ]),
      );
      attempt = await getPrisma().examAttempt.create({
        data: {
          answerOrder,
          assignmentId,
          attemptNumber: previousAttempts.length + 1,
          questionOrder,
          studentId: student.id,
        },
      });
    }

    const questionById = new Map(assignment.questions.map((question) => [question.id, question]));
    const questionOrder = Array.isArray(attempt.questionOrder)
      ? attempt.questionOrder.filter((id): id is string => typeof id === 'string')
      : [];
    const answerOrder = typeof attempt.answerOrder === 'object' && attempt.answerOrder !== null
      ? attempt.answerOrder as Record<string, unknown>
      : {};
    const questions = questionOrder.flatMap((questionId) => {
      const question = questionById.get(questionId);
      if (!question) return [];
      const byKey = new Map(options(question.options).map((option) => [option.key, option]));
      const keys = Array.isArray(answerOrder[questionId])
        ? (answerOrder[questionId] as unknown[]).filter((key): key is string => typeof key === 'string')
        : [];
      return [{
        diagramUrl: question.diagramUrl,
        id: question.id,
        options: keys.flatMap((key) => byKey.get(key) ?? []),
        prompt: question.prompt,
      }];
    });
    return NextResponse.json({
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      deadline: new Date(attempt.startedAt.getTime() + assignment.durationMin * 60_000).toISOString(),
      questions,
    });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[EXAM_ATTEMPT_START]', error);
    return NextResponse.json({ error: 'Unable to start this exam.' }, { status: 500 });
  }
}

const submitSchema = z.object({
  answers: z.record(z.string(), z.string().max(20)).default({}),
  attemptId: z.string().trim().min(1).max(128),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const [{ assignmentId }, student, parsed] = await Promise.all([
      params,
      requireLmsRole(['STUDENT']),
      request.json().then((body) => submitSchema.safeParse(body)).catch(() => null),
    ]);
    if (!parsed?.success) {
      return NextResponse.json({ error: 'Valid exam answers are required.' }, { status: 400 });
    }
    const attempt = await getPrisma().examAttempt.findFirst({
      where: { id: parsed.data.attemptId, assignmentId, studentId: student.id },
      include: { assignment: { include: { questions: true } } },
    });
    if (!attempt) return NextResponse.json({ error: 'Exam attempt not found.' }, { status: 404 });
    if (attempt.submittedAt) {
      return NextResponse.json({ error: 'This attempt was already submitted.' }, { status: 409 });
    }
    const deadline = attempt.startedAt.getTime() + attempt.assignment.durationMin * 60_000;
    const effectiveAnswers = Date.now() > deadline + 30_000 ? {} : parsed.data.answers;
    const correct = attempt.assignment.questions.filter(
      (question) => effectiveAnswers[question.id] === question.correctOptionKey,
    ).length;
    const score = Number(((correct / attempt.assignment.questions.length) * 100).toFixed(2));

    await getPrisma().$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: { answers: effectiveAnswers, score, submittedAt: new Date() },
      });
      const existing = await tx.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
        select: { grade: true },
      });
      const highestScore = Math.max(existing?.grade ?? 0, score);
      await tx.assignmentSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
        create: {
          assignmentId,
          feedback: `Highest score after attempt ${attempt.attemptNumber}.`,
          grade: highestScore,
          gradedAt: new Date(),
          lessonId: attempt.assignment.lessonId,
          status: 'GRADED',
          studentId: student.id,
        },
        update: {
          feedback: `Highest score after attempt ${attempt.attemptNumber}.`,
          grade: highestScore,
          gradedAt: new Date(),
          status: 'GRADED',
        },
      });
      await tx.lessonProgress.upsert({
        where: {
          studentId_lessonId: {
            lessonId: attempt.assignment.lessonId,
            studentId: student.id,
          },
        },
        create: {
          isCompleted: true,
          lessonId: attempt.assignment.lessonId,
          studentId: student.id,
          watchPercentage: 100,
        },
        update: { isCompleted: true, watchPercentage: 100 },
      });
    });
    await recalculateStudentHealthScores([student.id]);

    return NextResponse.json({
      attemptNumber: attempt.attemptNumber,
      highestScore: Math.max(
        score,
        ...(await getPrisma().examAttempt.findMany({
          where: { assignmentId, studentId: student.id, score: { not: null } },
          select: { score: true },
        })).map((item) => item.score ?? 0),
      ),
      review: attempt.assignment.questions
        .sort((left, right) => left.position - right.position)
        .map((question) => ({
          correctOptionKey: question.correctOptionKey,
          diagramUrl: question.diagramUrl,
          id: question.id,
          options: options(question.options),
          prompt: question.prompt,
          selectedOptionKey: effectiveAnswers[question.id] ?? null,
          workedSolution: question.workedSolution,
        })),
      score,
    });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[EXAM_ATTEMPT_SUBMIT]', error);
    return NextResponse.json({ error: 'Unable to submit this exam.' }, { status: 500 });
  }
}
