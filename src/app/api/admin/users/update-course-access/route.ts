import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import {
  AdminUserError,
  readAdminCourseAccessUpdate,
  updateStudentCourseAccess,
} from '@/lib/lms/admin-users';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new AdminUserError('Invalid request origin.', 403);
    }
    const admin = await requireLmsRole(ADMIN_ROLES);
    const input = readAdminCourseAccessUpdate(await request.json());
    const user = await updateStudentCourseAccess({
      actorId: admin.id,
      actorRole: admin.role,
      ...input,
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/radar');
    revalidatePath('/dashboard');
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof AdminUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LMS_ADMIN_UPDATE_COURSE_ACCESS]', error);
    return NextResponse.json(
      { error: 'Unable to update this student course access.' },
      { status: 500 },
    );
  }
}
