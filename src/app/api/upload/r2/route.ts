import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { getMaterialFileType } from '@/lib/lms/material-types';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import {
  PRESIGNED_UPLOAD_EXPIRY_SECONDS,
  sanitizeUploadFileStem,
  validateUploadFile,
} from '@/lib/lms/upload-validation';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function readUploadInput(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fileName = Reflect.get(value, 'fileName');
  const contentType = Reflect.get(value, 'contentType');
  const size = Reflect.get(value, 'size');
  const lessonId = Reflect.get(value, 'lessonId');
  const courseId = Reflect.get(value, 'courseId');
  const moduleId = Reflect.get(value, 'moduleId');
  const uploadKind = Reflect.get(value, 'uploadKind');

  if (
    typeof fileName !== 'string' ||
    !fileName.trim() ||
    fileName.length > 255 ||
    typeof contentType !== 'string' ||
    typeof size !== 'number' ||
    !Number.isSafeInteger(size)
  ) {
    return null;
  }

  return {
    fileName,
    contentType: contentType.trim().toLowerCase(),
    size,
    lessonId:
      typeof lessonId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(lessonId)
        ? lessonId
        : null,
    courseId:
      typeof courseId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(courseId)
        ? courseId
        : null,
    moduleId:
      typeof moduleId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(moduleId)
        ? moduleId
        : null,
    uploadKind: uploadKind === 'material' ? 'material' : 'lesson-content',
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiAuth(request, {
      allowedRoles: TEACHING_ROLES,
      allowCookieAuth: true,
    });
    if (!auth.ok) return auth.response;
    const teacher = auth.profile;
    if (!teacher) {
      return NextResponse.json(
        { error: 'Forbidden: LMS profile missing.' },
        { status: 403 },
      );
    }
    let requestBody: unknown;
    try {
      requestBody = JSON.parse(await request.text());
    } catch {
      return NextResponse.json(
        { error: 'A valid JSON request body is required.' },
        { status: 400 },
      );
    }
    const input = readUploadInput(requestBody);

    if (!input) {
      return NextResponse.json(
        { error: 'A valid file name, content type, and size are required.' },
        { status: 400 },
      );
    }

    const validation = validateUploadFile(
      input.fileName,
      input.contentType,
      input.size,
    );
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const materialFileType =
      input.uploadKind === 'material'
        ? getMaterialFileType(
            input.fileName,
            validation.value.contentType,
          )
        : null;

    if (input.uploadKind === 'material') {
      if (!materialFileType) {
        return NextResponse.json(
          {
            error: 'Course materials must be PDF, PPTX, DOCX, or XLSX files.',
          },
          { status: 415 },
        );
      }
      if (
        Number(Boolean(input.courseId)) +
          Number(Boolean(input.moduleId)) +
          Number(Boolean(input.lessonId)) !==
        1
      ) {
        return NextResponse.json(
          {
            error:
              'Choose exactly one course, module, or lesson for this material.',
          },
          { status: 400 },
        );
      }
    } else {
      if (!input.lessonId || input.courseId || input.moduleId) {
        return NextResponse.json(
          { error: 'A valid target lesson is required for lesson content.' },
          { status: 400 },
        );
      }
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
          { error: 'The target course was not found.' },
          { status: 404 },
        );
      }
    }

    if (input.lessonId) {
      const lesson = await getPrisma().lesson.findFirst({
        where: {
          id: input.lessonId,
          ...(isAdminRole(teacher.role)
            ? {}
            : { module: { course: { teacherId: teacher.id } } }),
        },
        select: { id: true },
      });

      if (!lesson) {
        return NextResponse.json(
          { error: 'The target lesson was not found.' },
          { status: 404 },
        );
      }
    }

    if (input.moduleId) {
      const courseModule = await getPrisma().module.findFirst({
        where: {
          id: input.moduleId,
          ...(isAdminRole(teacher.role)
            ? {}
            : { course: { teacherId: teacher.id } }),
        },
        select: { id: true },
      });
      if (!courseModule) {
        return NextResponse.json(
          { error: 'The target module was not found.' },
          { status: 404 },
        );
      }
    }

    const targetId =
      input.courseId ?? input.moduleId ?? input.lessonId ?? 'unassigned';
    const randomizedFileName =
      [randomUUID(), sanitizeUploadFileStem(input.fileName)].join('-') +
      validation.value.extension;
    const key =
      input.uploadKind === 'material'
        ? [
            'lms',
            teacher.id,
            'materials',
            input.courseId ? 'course' : input.moduleId ? 'module' : 'lesson',
            targetId,
            randomizedFileName,
          ].join('/')
        : [
            'lms',
            teacher.id,
            targetId,
            randomizedFileName,
          ].join('/');

    const expiresIn = PRESIGNED_UPLOAD_EXPIRY_SECONDS;
    const uploadUrl = await getPresignedUploadUrl(
      key,
      validation.value.contentType,
      expiresIn,
      input.size,
    );

    return NextResponse.json({
      uploadUrl,
      publicUrl: getPublicUrl(key),
      key,
      fileType: materialFileType,
      expiresIn,
      requiredHeaders: {
        'Content-Type': validation.value.contentType,
      },
    });
  } catch (error) {
    console.error('[LMS R2 presign]', error);
    return NextResponse.json(
      { error: 'Unable to prepare this upload.' },
      { status: 500 },
    );
  }
}
