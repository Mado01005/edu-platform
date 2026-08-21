import { ClipboardCheck } from 'lucide-react';
import { GradingDesk } from '@/components/teacher/grading-desk';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherGradingPage() {
  const teacher = await requireTeacherPage();
  const submissions = await getPrisma().assignmentSubmission.findMany({
    where: { assignment: { type: 'HOMEWORK', ...(isAdminRole(teacher.role) ? {} : { course: { teacherId: teacher.id } }) } },
    include: { assignment: { include: { course: { select: { title: true } } } }, lesson: { select: { title: true } }, student: { select: { email: true, name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
  return <>
    <header className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#084B2B]"><ClipboardCheck className="size-4" /> Assignment Desk</p><h1 className="mt-2 text-3xl font-black">Submission grading</h1><p className="mt-2 text-sm leading-6 text-slate-600">Review student work, record a grade, and send feedback instantly.</p></header>
    <GradingDesk submissions={submissions.map((submission) => ({ assignmentTitle: submission.assignment.title, courseTitle: submission.assignment.course.title, createdAt: submission.createdAt.toISOString(), feedback: submission.feedback, fileType: submission.fileType, fileUrl: submission.fileUrl, grade: submission.grade, id: submission.id, lessonTitle: submission.lesson.title, studentEmail: submission.student.email, studentName: submission.student.name }))} />
  </>;
}
