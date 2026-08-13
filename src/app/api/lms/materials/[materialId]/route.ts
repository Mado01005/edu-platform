import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import { isAdminRole, TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { deleteR2Object } from '@/lib/r2';
import { z } from 'zod';

export const runtime = 'nodejs';

const renameSchema = z.object({ title: z.string().trim().min(1).max(200) });

async function editableMaterial(materialId: string, teacher: Awaited<ReturnType<typeof requireLmsRole>>) {
  const material = await getPrisma().courseMaterial.findUnique({
    where: { id: materialId },
    include: {
      course: { select: { id: true, teacherId: true } },
      lesson: { select: { module: { select: { course: { select: { id: true, teacherId: true } } } } } },
      module: { select: { course: { select: { id: true, teacherId: true } } } },
    },
  });
  const course = material?.course ?? material?.module?.course ?? material?.lesson?.module.course;
  return material && course && (isAdminRole(teacher.role) || course.teacherId === teacher.id)
    ? { course, material }
    : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    const [{ materialId }, teacher] = await Promise.all([params, requireLmsRole(TEACHING_ROLES)]);
    const input = renameSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? 'Enter a valid file title.' }, { status: 400 });
    const editable = await editableMaterial(materialId, teacher);
    if (!editable) return NextResponse.json({ error: 'Material not found.' }, { status: 404 });
    const material = await getPrisma().courseMaterial.update({ where: { id: materialId }, data: { title: input.data.title } });
    revalidatePath(`/teacher/courses/${editable.course.id}`);
    return NextResponse.json({ material });
  } catch (error) {
    if (error instanceof LmsAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[LMS_MATERIAL_RENAME]', error);
    return NextResponse.json({ error: 'Unable to rename this material.' }, { status: 500 });
  }
}

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
    const editable = await editableMaterial(materialId, teacher);
    if (!editable) {
      return NextResponse.json(
        { error: 'Material not found.' },
        { status: 404 },
      );
    }
    const { course, material } = editable;

    await deleteR2Object(material.objectKey);
    await getPrisma().courseMaterial.delete({ where: { id: material.id } });
    revalidatePath(`/teacher/courses/${course.id}`);
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
