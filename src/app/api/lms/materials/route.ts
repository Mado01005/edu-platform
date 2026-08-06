import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import {
  MATERIAL_FILE_TYPES,
  MAX_MATERIAL_UPLOAD_BYTES,
} from '@/lib/lms/material-types';
import { isAdminRole, TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import {
  deleteR2Object,
  getPublicUrl,
  verifyR2ObjectExists,
} from '@/lib/r2';

export const runtime = 'nodejs';

const materialInputSchema = z
  .object({
    courseId: z.string().trim().min(1).max(64).nullable().optional(),
    fileSize: z.number().int().min(1).max(MAX_MATERIAL_UPLOAD_BYTES),
    fileType: z.enum(MATERIAL_FILE_TYPES),
    lessonId: z.string().trim().min(1).max(64).nullable().optional(),
    moduleId: z.string().trim().min(1).max(64).nullable().optional(),
    objectKey: z
      .string()
      .trim()
      .max(500)
      .regex(/^lms\/[^/]+\/materials\/(course|module|lesson)\/[^/]+\/[^/]+$/),
    title: z.string().trim().min(1).max(200),
  })
  .refine(
    ({ courseId, lessonId, moduleId }) =>
      Number(Boolean(courseId)) + Number(Boolean(moduleId)) + Number(Boolean(lessonId)) === 1,
    { message: 'Choose exactly one course, module, or lesson for this material.' },
  );

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin.' },
        { status: 403 },
      );
    }

    const teacher = await requireLmsRole(TEACHING_ROLES);
    const parsed = materialInputSchema.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            'Valid material details are required.',
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    let targetCourseId = input.courseId ?? '';
    const expectedTarget = input.courseId
      ? `/materials/course/${input.courseId}/`
      : input.moduleId
        ? `/materials/module/${input.moduleId}/`
        : `/materials/lesson/${input.lessonId}/`;

    if (
      !input.objectKey.startsWith(`lms/${teacher.id}/`) ||
      !input.objectKey.includes(expectedTarget)
    ) {
      return NextResponse.json(
        { error: 'This uploaded object does not belong to the selected target.' },
        { status: 403 },
      );
    }

    if (input.courseId) {
      const course = await getPrisma().course.findFirst({
        where: {
          id: input.courseId,
          ...(isAdminRole(teacher.role) ? {} : { teacherId: teacher.id }),
        },
        select: { id: true },
      });
      if (!course) {
        return NextResponse.json(
          { error: 'Course not found.' },
          { status: 404 },
        );
      }
    } else if (input.moduleId) {
      const courseModule = await getPrisma().module.findFirst({
        where: {
          id: input.moduleId,
          ...(isAdminRole(teacher.role) ? {} : { course: { teacherId: teacher.id } }),
        },
        select: { courseId: true },
      });
      if (!courseModule) return NextResponse.json({ error: 'Module not found.' }, { status: 404 });
      targetCourseId = courseModule.courseId;
    } else {
      const lesson = await getPrisma().lesson.findFirst({
        where: {
          id: input.lessonId!,
          ...(isAdminRole(teacher.role)
            ? {}
            : { module: { course: { teacherId: teacher.id } } }),
        },
        select: { id: true, module: { select: { courseId: true } } },
      });
      if (!lesson) {
        return NextResponse.json(
          { error: 'Lesson not found.' },
          { status: 404 },
        );
      }
      targetCourseId = lesson.module.courseId;
    }

    const actualSize = await verifyR2ObjectExists(input.objectKey);
    if (actualSize === null || actualSize !== input.fileSize) {
      return NextResponse.json(
        { error: 'The uploaded file could not be verified in R2.' },
        { status: 409 },
      );
    }

    try {
      const material = await getPrisma().courseMaterial.create({
        data: {
          courseId: input.courseId ?? null,
          fileSize: actualSize,
          fileType: input.fileType,
          fileUrl: getPublicUrl(input.objectKey),
          lessonId: input.lessonId ?? null,
          moduleId: input.moduleId ?? null,
          objectKey: input.objectKey,
          title: input.title,
        },
      });

      revalidatePath(`/teacher/courses/${targetCourseId}`);
      revalidatePath(`/courses/${targetCourseId}/learn`);
      return NextResponse.json({ material }, { status: 201 });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await getPrisma().courseMaterial.findUnique({
          where: { objectKey: input.objectKey },
        });
        if (existing) {
          return NextResponse.json({ material: existing });
        }
      }

      await deleteR2Object(input.objectKey).catch((cleanupError) => {
        console.error('[LMS_MATERIAL_R2_ROLLBACK]', cleanupError);
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_MATERIAL_CREATE]', error);
    return NextResponse.json(
      { error: 'Unable to save this course material.' },
      { status: 500 },
    );
  }
}
