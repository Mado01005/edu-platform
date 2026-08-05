import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const CONTENT_TYPE_EXTENSIONS: Record<string, readonly string[]> = {
  'application/pdf': ['pdf'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov', 'qt'],
};

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  return (normalized || 'upload').slice(-120);
}

function readUploadInput(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const fileName = Reflect.get(value, 'fileName');
  const contentType = Reflect.get(value, 'contentType');
  const size = Reflect.get(value, 'size');
  const lessonId = Reflect.get(value, 'lessonId');

  if (
    typeof fileName !== 'string' ||
    !fileName.trim() ||
    fileName.length > 255 ||
    typeof contentType !== 'string' ||
    typeof size !== 'number' ||
    !Number.isFinite(size)
  ) {
    return null;
  }

  return {
    fileName,
    contentType: contentType.toLowerCase(),
    size,
    lessonId:
      typeof lessonId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(lessonId)
        ? lessonId
        : 'unassigned',
  };
}

export async function POST(request: Request) {
  try {
    const teacher = await requireLmsRole(TEACHING_ROLES);
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

    if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
      return NextResponse.json(
        { error: 'Only PDF, MP4, WebM, and QuickTime files are allowed.' },
        { status: 415 },
      );
    }

    const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!CONTENT_TYPE_EXTENSIONS[input.contentType]?.includes(extension)) {
      return NextResponse.json(
        { error: 'The file extension does not match its declared content type.' },
        { status: 415 },
      );
    }

    if (input.size <= 0 || input.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'The file must be larger than 0 bytes and no larger than 2 GB.' },
        { status: 413 },
      );
    }

    if (input.lessonId !== 'unassigned') {
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

    const key = [
      'lms',
      teacher.id,
      input.lessonId,
      `${randomUUID()}-${sanitizeFileName(input.fileName)}`,
    ].join('/');

    const expiresIn = 15 * 60;
    const uploadUrl = await getPresignedUploadUrl(
      key,
      input.contentType,
      expiresIn,
    );

    return NextResponse.json({
      uploadUrl,
      publicUrl: getPublicUrl(key),
      key,
      expiresIn,
      requiredHeaders: {
        'Content-Type': input.contentType,
      },
    });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS R2 presign]', error);
    return NextResponse.json(
      { error: 'Unable to prepare this upload.' },
      { status: 500 },
    );
  }
}
