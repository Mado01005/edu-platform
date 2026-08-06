import { NextResponse } from 'next/server';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const [{ materialId }, user] = await Promise.all([
      params,
      requireLmsUser(),
    ]);
    const enrollmentFilter =
      user.role === 'STUDENT'
        ? { enrollments: { where: { studentId: user.id }, select: { id: true } } }
        : {};
    const material = await getPrisma().courseMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: {
          select: {
            id: true,
            isPublished: true,
            teacherId: true,
            ...enrollmentFilter,
          },
        },
        lesson: {
          select: {
            isFree: true,
            module: {
              select: {
                course: {
                  select: {
                    id: true,
                    isPublished: true,
                    teacherId: true,
                    ...enrollmentFilter,
                  },
                },
              },
            },
          },
        },
        module: {
          select: {
            course: { select: { id: true, isPublished: true, teacherId: true, ...enrollmentFilter } },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found.' },
        { status: 404 },
      );
    }

    const course = material.course ?? material.module?.course ?? material.lesson?.module.course;
    const enrollmentCount =
      course && 'enrollments' in course ? course.enrollments.length : 0;
    const canTeach =
      Boolean(course) &&
      (isAdminRole(user.role) ||
        (user.role === 'TEACHER' && course?.teacherId === user.id));
    const canStudy =
      user.role === 'STUDENT' &&
      Boolean(
        course?.isPublished &&
          (enrollmentCount > 0 || material.lesson?.isFree),
      );

    if (!course || (!canTeach && !canStudy)) {
      return NextResponse.json(
        { error: 'You do not have access to this material.' },
        { status: 403 },
      );
    }

    const downloadUrl = await getPresignedDownloadUrl(
      material.objectKey,
      5 * 60,
      material.title,
    );
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_MATERIAL_DOWNLOAD]', error);
    return NextResponse.json(
      { error: 'Unable to prepare this download.' },
      { status: 500 },
    );
  }
}
