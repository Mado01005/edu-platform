import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  K12Error,
  readSubjectAssignment,
  upsertCoreSubjectAssignment,
} from '@/lib/lms/k12';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new K12Error('Invalid request origin.', 403);
    }

    await requireLmsRole(ADMIN_ROLES);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new K12Error('A valid JSON request body is required.');
    }

    const subject = await upsertCoreSubjectAssignment(
      readSubjectAssignment(body),
    );

    revalidatePath('/admin/k12');
    return NextResponse.json({ subject });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof K12Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[K12_SUBJECT_ASSIGNMENT]', error);
    return NextResponse.json(
      { error: 'Unable to assign this subject teacher.' },
      { status: 500 },
    );
  }
}
