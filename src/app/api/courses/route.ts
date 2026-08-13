import { GradeLevel, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { resolveCurriculumTeacherId } from '@/lib/lms/curriculum-owner';

export const dynamic = 'force-dynamic';

function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && Object.values(GradeLevel).includes(value as GradeLevel);
}

function slugBase(title: string) {
  return title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 170) || 'course';
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
    const titleCandidate = body.title ?? body.name;
    const title = typeof titleCandidate === 'string' ? titleCandidate.trim() : '';
    const description = typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 10_000)
      : null;
    const subjectId = typeof body.subjectId === 'string' && body.subjectId.trim()
      ? body.subjectId.trim()
      : null;
    let gradeLevel = body.gradeLevel === null || body.gradeLevel === undefined || body.gradeLevel === ''
      ? null
      : body.gradeLevel;

    if (!title || title.length > 200 || (gradeLevel !== null && !isGradeLevel(gradeLevel))) {
      return NextResponse.json(
        { error: 'A valid course title and grade level are required.' },
        { status: 400 },
      );
    }

    let subjectTeacherId: string | null = null;
    if (subjectId) {
      const subject = await getPrisma().subject.findFirst({
        where: {
          id: subjectId,
          ...(isAdminRole(auth.profile.role) ? {} : { teacherId: auth.profile.id }),
        },
        select: { grade: true, teacherId: true },
      });
      if (!subject) {
        return NextResponse.json({ error: 'The selected subject was not found.' }, { status: 404 });
      }
      if (gradeLevel && gradeLevel !== subject.grade) {
        return NextResponse.json(
          { error: 'The selected subject does not belong to that grade.' },
          { status: 400 },
        );
      }
      gradeLevel = subject.grade;
      subjectTeacherId = subject.teacherId;
    }

    const teacherId = await resolveCurriculumTeacherId(
      auth.profile,
      subjectTeacherId,
    );

    const course = await getPrisma().course.create({
      data: {
        description,
        gradeLevel: gradeLevel as GradeLevel | null,
        slug: `${slugBase(title)}-${nanoid(6).toLowerCase()}`,
        subjectId,
        teacherId,
        title,
      },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Unable to create a unique course address.' }, { status: 409 });
    }
    console.error('[API_COURSE_CREATE]', error);
    return NextResponse.json({ error: 'Unable to create the course.' }, { status: 500 });
  }
}
