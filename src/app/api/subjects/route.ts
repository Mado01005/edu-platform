import { GradeLevel, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { resolveCurriculumTeacherId } from '@/lib/lms/curriculum-owner';

export const dynamic = 'force-dynamic';

function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && Object.values(GradeLevel).includes(value as GradeLevel);
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(request, {
    allowedRoles: TEACHING_ROLES,
    allowCookieAuth: true,
  });
  if (!auth.ok) return auth.response;

  const subjects = await getPrisma().subject.findMany({
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(subjects, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const gradeLevel = body.gradeLevel ?? body.grade;
    if (!name || name.length > 120 || !isGradeLevel(gradeLevel)) {
      return NextResponse.json(
        { error: 'Subject name and grade level are required.' },
        { status: 400 },
      );
    }

    const teacherId = await resolveCurriculumTeacherId(auth.profile);
    const subject = await getPrisma().subject.create({
      data: { grade: gradeLevel, name, teacherId },
    });
    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'That subject already exists for the selected grade.' },
        { status: 409 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    console.error('[API_SUBJECT_CREATE]', error);
    return NextResponse.json({ error: 'Unable to create the subject.' }, { status: 500 });
  }
}
