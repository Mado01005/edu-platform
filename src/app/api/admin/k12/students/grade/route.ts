import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  bulkAssignStudentGrade,
  K12Error,
  readBulkGradeAssignment,
} from '@/lib/lms/k12';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
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

    const result = await bulkAssignStudentGrade(
      readBulkGradeAssignment(body),
    );

    revalidatePath('/admin/k12');
    revalidatePath('/admin/radar');
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof K12Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[K12_STUDENT_GRADE_ASSIGNMENT]', error);
    return NextResponse.json(
      { error: 'Unable to update student grades.' },
      { status: 500 },
    );
  }
}
