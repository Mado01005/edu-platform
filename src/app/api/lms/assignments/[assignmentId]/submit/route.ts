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

const fileSchema = z.object({
  fileType: z.enum(['PDF', 'JPG', 'PNG']),
  objectKey: z.string().trim().max(500),
});
const inputSchema = z
  .object({
    files: z.array(fileSchema).max(8).optional(),
    fileType: z.enum(['PDF', 'JPG', 'PNG']).optional(),
    objectKey: z.string().trim().max(500).optional(),
    textSolution: z.string().trim().max(20_000).optional(),
  })
  .refine(
    (input) =>
      Boolean(input.textSolution) ||
      Boolean(input.files?.length) ||
      Boolean(input.fileType && input.objectKey),
    { message: 'Add a written solution or at least one file.' },
  );

async function deleteUploadedObjects(objectKeys: readonly string[]) {
  await Promise.all(
    objectKeys.map((key) => deleteR2Object(key).catch(() => undefined)),
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const uploadedKeys: string[] = [];
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const [{ assignmentId }, student] = await Promise.all([
      params,
      requireLmsRole(['STUDENT']),
    ]);
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Valid submission details are required.' },
        { status: 400 },
      );
    }
    const files = parsed.data.files ??
      (parsed.data.fileType && parsed.data.objectKey
        ? [{ fileType: parsed.data.fileType, objectKey: parsed.data.objectKey }]
        : []);
    const expectedPrefix = `lms/${student.id}/assignment-submissions/${assignmentId}/`;
    if (files.some((file) => !file.objectKey.startsWith(expectedPrefix) || file.objectKey.includes('..'))) {
      return NextResponse.json(
        { error: 'One or more uploads do not belong to this assignment.' },
        { status: 403 },
      );
    }
    uploadedKeys.push(...files.map((file) => file.objectKey));

    const assignment = await getPrisma().assignment.findFirst({
      where: {
        id: assignmentId,
        type: 'HOMEWORK',
        course: {
          isPublished: true,
          enrollments: { some: { studentId: student.id } },
        },
      },
      select: { courseId: true, lessonId: true },
    });
    if (!assignment) {
      await deleteUploadedObjects(uploadedKeys);
      return NextResponse.json(
        { error: 'Assignment not found or course access is unavailable.' },
        { status: 404 },
      );
    }

    const metadata = await Promise.all(
      files.map(async (file) => ({
        file,
        metadata: await getR2ObjectMetadata(file.objectKey),
      })),
    );
    const expectedContentTypes = {
      JPG: 'image/jpeg',
      PDF: 'application/pdf',
      PNG: 'image/png',
    } as const;
    const invalidUpload = metadata.find(({ file, metadata: item }) =>
      !item ||
      !item.sizeBytes ||
      item.sizeBytes > MAX_ASSIGNMENT_SUBMISSION_BYTES ||
      item.contentType !== expectedContentTypes[file.fileType],
    );
    if (invalidUpload) {
      await deleteUploadedObjects(uploadedKeys);
      return NextResponse.json(
        { error: 'One or more uploaded files could not be verified.' },
        { status: 409 },
      );
    }

    const attachmentUrls = files.map((file) => getPublicUrl(file.objectKey));
    const totalSize = metadata.reduce(
      (sum, item) => sum + (item.metadata?.sizeBytes ?? 0),
      0,
    );
    const firstFile = files[0] ?? null;
    const { previous, submission } = await getPrisma().$transaction(
      async (tx) => {
        const previousSubmission = await tx.assignmentSubmission.findUnique({
          where: {
            assignmentId_studentId: { assignmentId, studentId: student.id },
          },
          select: { attachmentObjectKeys: true, objectKey: true },
        });
        const savedSubmission = await tx.assignmentSubmission.upsert({
          where: {
            assignmentId_studentId: { assignmentId, studentId: student.id },
          },
          create: {
            assignmentId,
            attachmentObjectKeys: files.map((file) => file.objectKey),
            attachmentUrls,
            fileSize: files.length ? totalSize : null,
            fileType: firstFile?.fileType ?? null,
            fileUrl: firstFile ? getPublicUrl(firstFile.objectKey) : null,
            lessonId: assignment.lessonId,
            objectKey: firstFile?.objectKey ?? null,
            studentId: student.id,
            textSolution: parsed.data.textSolution || null,
          },
          update: {
            attachmentObjectKeys: files.map((file) => file.objectKey),
            attachmentUrls,
            createdAt: new Date(),
            feedback: null,
            fileSize: files.length ? totalSize : null,
            fileType: firstFile?.fileType ?? null,
            fileUrl: firstFile ? getPublicUrl(firstFile.objectKey) : null,
            grade: null,
            gradedAt: null,
            objectKey: firstFile?.objectKey ?? null,
            rubricSelections: Prisma.DbNull,
            status: 'SUBMITTED',
            textSolution: parsed.data.textSolution || null,
          },
        });
        await tx.lessonProgress.upsert({
          where: {
            studentId_lessonId: {
              lessonId: assignment.lessonId,
              studentId: student.id,
            },
          },
          create: {
            isCompleted: true,
            lessonId: assignment.lessonId,
            studentId: student.id,
            watchPercentage: 100,
          },
          update: { isCompleted: true, watchPercentage: 100 },
        });
        return {
          previous: previousSubmission,
          submission: savedSubmission,
        };
      },
    );

    const previousJsonKeys = Array.isArray(previous?.attachmentObjectKeys)
      ? previous.attachmentObjectKeys.filter((key): key is string => typeof key === 'string')
      : [];
    const previousKeys = new Set([
      ...previousJsonKeys,
      ...(previous?.objectKey ? [previous.objectKey] : []),
    ]);
    await Promise.all(
      [...previousKeys]
        .filter((key) => !uploadedKeys.includes(key))
        .map((key) => deleteR2Object(key).catch((error) => {
          console.error('[ASSIGNMENT_OLD_FILE_DELETE]', error);
        })),
    );
    revalidatePath(`/courses/${assignment.courseId}/learn/lessons/${assignment.lessonId}`);
    revalidatePath('/teacher/grading');
    return NextResponse.json({ submission });
  } catch (error) {
    await deleteUploadedObjects(uploadedKeys);
    if (error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'That file was already submitted.' }, { status: 409 });
    }
    console.error('[ASSIGNMENT_SUBMIT]', error);
    return NextResponse.json({ error: 'Unable to submit this assignment.' }, { status: 500 });
  }
}
