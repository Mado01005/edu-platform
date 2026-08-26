import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { isAdminRole, TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

const optionSchema = z.object({
  key: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(2_000),
});
const questionSchema = z.object({
  correctOptionKey: z.string().trim().min(1).max(10),
  diagramUrl: z.string().url().startsWith('https://').max(2_000).nullable().optional(),
  options: z.array(optionSchema).min(2).max(6),
  prompt: z.string().trim().min(1).max(10_000),
  workedSolution: z.string().trim().min(1).max(20_000),
}).superRefine((question, context) => {
  const keys = question.options.map((option) => option.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: 'custom', message: 'Answer option keys must be unique.' });
  }
  if (!keys.includes(question.correctOptionKey)) {
    context.addIssue({ code: 'custom', message: 'The correct answer must match an option.' });
  }
});
const inputSchema = z.object({ questions: z.array(questionSchema).min(1).max(200) });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const [{ assignmentId }, teacher, parsed] = await Promise.all([
      params,
      requireLmsRole(TEACHING_ROLES),
      request.json().then((body) => inputSchema.safeParse(body)).catch(() => null),
    ]);
    if (!parsed?.success) {
      return NextResponse.json(
        { error: parsed?.error.issues[0]?.message ?? 'Valid exam questions are required.' },
        { status: 400 },
      );
    }
    const assignment = await getPrisma().assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'QUIZ',
        ...(isAdminRole(teacher.role) ? {} : { course: { teacherId: teacher.id } }),
      },
      select: { courseId: true, _count: { select: { examAttempts: true } } },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }
    if (assignment._count.examAttempts > 0) {
      return NextResponse.json(
        { error: 'Questions cannot be replaced after a student starts this exam.' },
        { status: 409 },
      );
    }

    await getPrisma().$transaction(async (tx) => {
      await tx.examQuestion.deleteMany({ where: { assignmentId } });
      await tx.examQuestion.createMany({
        data: parsed.data.questions.map((question, position) => ({
          assignmentId,
          correctOptionKey: question.correctOptionKey,
          diagramUrl: question.diagramUrl || null,
          options: question.options,
          position,
          prompt: question.prompt,
          workedSolution: question.workedSolution,
        })),
      });
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { questionCount: parsed.data.questions.length },
      });
    });
    return NextResponse.json({ count: parsed.data.questions.length });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[EXAM_QUESTION_SAVE]', error);
    return NextResponse.json({ error: 'Unable to save exam questions.' }, { status: 500 });
  }
}
