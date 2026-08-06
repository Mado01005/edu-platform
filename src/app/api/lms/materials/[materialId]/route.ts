import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { isAdminRole, TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { deleteR2Object } from '@/lib/r2';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { error: 'Invalid request origin.' },
        { status: 403 },
      );
    }

    const [{ materialId }, teacher] = await Promise.all([
      params,
      requireLmsRole(TEACHING_ROLES),
    ]);
    const material = await getPrisma().courseMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: { select: { id: true, teacherId: true } },
        lesson: {
          select: {
            module: {
              select: { course: { select: { id: true, teacherId: true } } },
            },
          },
        },
      },
    });
    const course = material?.course ?? material?.lesson?.module.course;

    if (
      !material ||
      !course ||
      (!isAdminRole(teacher.role) && course.teacherId !== teacher.id)
    ) {
      return NextResponse.json(
        { error: 'Material not found.' },
        { status: 404 },
      );
    }

    await deleteR2Object(material.objectKey);
    await getPrisma().courseMaterial.delete({ where: { id: material.id } });
    revalidatePath(`/teacher/courses/${course.id}/edit`);
    revalidatePath(`/courses/${course.id}/learn`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_MATERIAL_DELETE]', error);
    return NextResponse.json(
      { error: 'Unable to delete this material.' },
      { status: 500 },
    );
  }
}
