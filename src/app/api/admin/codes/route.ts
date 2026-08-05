import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { AccessCodeError, generateDigitalAccessCodes } from '@/lib/lms/access-codes';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const actor = await requireLmsRole(ADMIN_ROLES);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Valid JSON is required.' }, { status: 400 });
    const result = await generateDigitalAccessCodes({
      actorId: actor.id,
      count: body.count,
      courseId: body.courseId,
      expiresAt: body.expiresAt,
      gradeLevel: body.gradeLevel,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AccessCodeError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ADMIN_ACCESS_CODES]', error);
    return NextResponse.json({ error: 'Unable to generate access codes.' }, { status: 500 });
  }
}
