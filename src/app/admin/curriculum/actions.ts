'use server';

import { GradeLevel, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPrisma } from '@/lib/prisma';
import { requireLmsRole } from '@/lib/lms/auth';
import { TEACHING_ROLES } from '@/lib/lms/roles';
import { resolveCurriculumTeacherId } from '@/lib/lms/curriculum-owner';

const subjectSchema = z.object({
  grade: z.nativeEnum(GradeLevel),
  name: z
    .string()
    .trim()
    .min(1, 'Subject name is required.')
    .max(120, 'Subject name must be 120 characters or fewer.'),
});

export type SubjectActionState = {
  error: string | null;
  success: boolean;
};

export async function createSubjectAction(
  _previousState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  try {
    const parsed = subjectSchema.safeParse({
      grade: formData.get('grade'),
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? 'Enter valid subject details.',
        success: false,
      };
    }

    const admin = await requireLmsRole(TEACHING_ROLES);
    const teacherId = await resolveCurriculumTeacherId(admin);
    await getPrisma().subject.create({
      data: {
        grade: parsed.data.grade,
        name: parsed.data.name,
        teacherId,
      },
    });
    revalidatePath('/admin/curriculum');
    revalidatePath('/teacher/courses');
    return { error: null, success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        error: 'That subject already exists for the selected grade.',
        success: false,
      };
    }

    console.error('[CREATE_SUBJECT]', error);
    return { error: 'Unable to create the subject.', success: false };
  }
}
