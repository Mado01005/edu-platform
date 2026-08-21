import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { WorkspaceActionHub } from '@/components/navigation/workspace-action-hub';
import { requireTeacherPage } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function TeacherHomePage() {
  const teacher = await requireTeacherPage();
  const pendingAssignments = await getPrisma().assignmentSubmission.count({
    where: {
      status: 'SUBMITTED',
      assignment: {
        type: 'HOMEWORK',
        ...(isAdminRole(teacher.role)
          ? {}
          : { course: { teacherId: teacher.id } }),
      },
    },
  });

  return (
    <>
      <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#084B2B]">
          <ClipboardCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#084B2B]">
            What to do next · Assignment queue
          </p>
          <h2 className="mt-1 text-xl font-black">
            {pendingAssignments} assignment{pendingAssignments === 1 ? '' : 's'} waiting for grading
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Open the grading desk to review student work and send feedback.
          </p>
        </div>
        <Link
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-bold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md"
          href="/teacher/grading"
        >
          <ClipboardCheck aria-hidden="true" className="size-4" />
          Grade Assignments
        </Link>
      </section>
      <WorkspaceActionHub mode="teacher" userName={teacher.name} />
    </>
  );
}
