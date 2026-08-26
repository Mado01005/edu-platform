'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireLmsRole } from '@/lib/lms/auth';
import { deliverSystemNotification } from '@/lib/lms/notifications';
import { isAdminRole, TEACHING_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export type GradeActionState = { error: string | null; success: boolean };
const gradeSchema = z.object({
  feedback: z.string().trim().max(5_000, 'Feedback must be 5,000 characters or fewer.'),
  grade: z.coerce.number().min(0, 'Grade cannot be below 0.').max(10, 'Grade cannot exceed 10.'),
  rubric: z.array(z.string().trim().min(1).max(80)).max(10),
});

export async function gradeAssignmentSubmissionAction(submissionId: string, _previous: GradeActionState, formData: FormData): Promise<GradeActionState> {
  try {
    const teacher = await requireLmsRole(TEACHING_ROLES);
    const input = gradeSchema.safeParse({
      feedback: formData.get('feedback') ?? '',
      grade: formData.get('grade'),
      rubric: formData.getAll('rubric'),
    });
    if (!input.success) throw new Error(input.error.issues[0]?.message ?? 'Enter a valid grade.');
    const submission = await getPrisma().assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: { lessonId: true, studentId: true, assignment: { select: { title: true, courseId: true, course: { select: { teacherId: true } } } } },
    });
    if (!submission || (!isAdminRole(teacher.role) && submission.assignment.course.teacherId !== teacher.id)) throw new Error('Submission not found.');
    await getPrisma().assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        feedback: input.data.feedback || null,
        grade: input.data.grade,
        gradedAt: new Date(),
        rubricSelections: input.data.rubric,
        status: 'GRADED',
      },
    });
    await deliverSystemNotification({
      broadcast: false,
      includeParents: true,
      message: `Your submission for ${submission.assignment.title} was graded ${input.data.grade} / 10.`,
      studentId: submission.studentId,
      title: 'Assignment graded',
      type: 'GRADE',
      url: `/courses/${submission.assignment.courseId}/learn/lessons/${submission.lessonId}`,
      userIds: [],
    });
    revalidatePath('/teacher/grading');
    revalidatePath(`/courses/${submission.assignment.courseId}/learn/lessons/${submission.lessonId}`);
    revalidatePath('/api/notifications');
    return { error: null, success: true };
  } catch (error) {
    console.error('[ASSIGNMENT_GRADE]', error);
    return { error: error instanceof Error ? error.message : 'Unable to save this grade.', success: false };
  }
}
