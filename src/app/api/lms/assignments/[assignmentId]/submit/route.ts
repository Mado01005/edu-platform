import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { MAX_ASSIGNMENT_SUBMISSION_BYTES } from '@/lib/lms/submission-types';
import { getPrisma } from '@/lib/prisma';
import { deleteR2Object, getPublicUrl, getR2ObjectMetadata } from '@/lib/r2';

export const runtime = 'nodejs';
const inputSchema = z.object({ fileType: z.enum(['PDF', 'JPG', 'PNG']), objectKey: z.string().trim().max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  let uploadedKey = '';
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const [{ assignmentId }, student] = await Promise.all([params, requireLmsRole(['STUDENT'])]);
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Valid uploaded file details are required.' }, { status: 400 });
    uploadedKey = parsed.data.objectKey;
    const expectedPrefix = `lms/${student.id}/assignment-submissions/${assignmentId}/`;
    if (!uploadedKey.startsWith(expectedPrefix)) return NextResponse.json({ error: 'This upload does not belong to your assignment.' }, { status: 403 });
    const assignment = await getPrisma().assignment.findFirst({
      where: { id: assignmentId, type: 'HOMEWORK', course: { isPublished: true, enrollments: { some: { studentId: student.id } } } },
      select: { courseId: true, lessonId: true },
    });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found or course access is unavailable.' }, { status: 404 });
    const metadata = await getR2ObjectMetadata(uploadedKey);
    const expectedContentTypes = {
      JPG: 'image/jpeg',
      PDF: 'application/pdf',
      PNG: 'image/png',
    } as const;
    const size = metadata?.sizeBytes ?? 0;
    if (
      !metadata ||
      !size ||
      size > MAX_ASSIGNMENT_SUBMISSION_BYTES ||
      metadata.contentType !== expectedContentTypes[parsed.data.fileType]
    ) {
      return NextResponse.json(
        { error: 'The uploaded file could not be verified.' },
        { status: 409 },
      );
    }
    const previous = await getPrisma().assignmentSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: student.id } }, select: { objectKey: true } });
    const submission = await getPrisma().assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
      create: { assignmentId, lessonId: assignment.lessonId, studentId: student.id, fileUrl: getPublicUrl(uploadedKey), objectKey: uploadedKey, fileType: parsed.data.fileType, fileSize: size },
      update: { fileUrl: getPublicUrl(uploadedKey), objectKey: uploadedKey, fileType: parsed.data.fileType, fileSize: size, grade: null, feedback: null, status: 'SUBMITTED', gradedAt: null, createdAt: new Date() },
    });
    if (previous && previous.objectKey !== uploadedKey) await deleteR2Object(previous.objectKey).catch((error) => console.error('[ASSIGNMENT_OLD_FILE_DELETE]', error));
    revalidatePath(`/courses/${assignment.courseId}/learn/lessons/${assignment.lessonId}`);
    revalidatePath('/teacher/grading');
    return NextResponse.json({ submission });
  } catch (error) {
    if (uploadedKey) await deleteR2Object(uploadedKey).catch(() => undefined);
    if (error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'That file was already submitted.' }, { status: 409 });
    console.error('[ASSIGNMENT_SUBMIT]', error);
    return NextResponse.json({ error: 'Unable to submit this assignment.' }, { status: 500 });
  }
}
