import { ContentType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isContentType(value: unknown): value is ContentType {
  return typeof value === 'string' && Object.values(ContentType).includes(value as ContentType);
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const auth = await requireApiAuth(request, {
      allowedRoles: TEACHING_ROLES,
      allowCookieAuth: true,
    });
    if (!auth.ok) return auth.response;
    if (!auth.profile) {
      return NextResponse.json({ error: 'Forbidden: LMS profile missing.' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const moduleId = typeof body.moduleId === 'string' ? body.moduleId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const contentType = body.contentType ?? 'VIMEO';
    if (!moduleId || !title || title.length > 200 || !isContentType(contentType)) {
      return NextResponse.json(
        { error: 'Module, lesson title, and content type are required.' },
        { status: 400 },
      );
    }

    const courseModule = await getPrisma().module.findFirst({
      where: {
        id: moduleId,
        ...(isAdminRole(auth.profile.role) ? {} : { course: { teacherId: auth.profile.id } }),
      },
      select: { courseId: true },
    });
    if (!courseModule) {
      return NextResponse.json({ error: 'The target module was not found.' }, { status: 404 });
    }

    const lastLesson = await getPrisma().lesson.findFirst({
      where: { moduleId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const lesson = await getPrisma().$transaction(async (transaction) => {
      const created = await transaction.lesson.create({
        data: {
          contentType,
          moduleId,
          position: (lastLesson?.position ?? 0) + 1,
          title,
        },
      });
      if (contentType === 'QUIZ' || contentType === 'ASSIGNMENT') {
        await transaction.assignment.create({
          data: {
            courseId: courseModule.courseId,
            lessonId: created.id,
            title,
            type: contentType === 'QUIZ' ? 'QUIZ' : 'HOMEWORK',
          },
        });
      }
      return created;
    });
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    console.error('[API_LESSON_CREATE]', error);
    return NextResponse.json({ error: 'Unable to create the lesson.' }, { status: 500 });
  }
}
