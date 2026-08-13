import { Activity, ShieldCheck } from 'lucide-react';
import {
  StudentRadar,
  type RadarStudent,
} from '@/app/admin/radar/StudentRadar';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireLmsPageRole } from '@/lib/lms/auth';
import {
  getStudentHealthRadarPage,
  type StudentHealthRadarStatus,
} from '@/lib/lms/health';
import { isGradeLevel } from '@/lib/lms/k12';
import { ADMIN_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RadarSearchParams = {
  grade?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function StudentRadarPage({
  searchParams,
}: {
  searchParams: Promise<RadarSearchParams>;
}) {
  const admin = await requireLmsPageRole(ADMIN_ROLES, 'admin-required');
  const params = await searchParams;
  const rawGrade = firstValue(params.grade);
  const rawStatus = firstValue(params.status);
  const rawPage = Number(firstValue(params.page));
  const gradeLevel =
    rawGrade === 'UNASSIGNED'
      ? 'UNASSIGNED'
      : isGradeLevel(rawGrade)
        ? rawGrade
        : null;
  const status: StudentHealthRadarStatus =
    rawStatus === 'AT_RISK' || rawStatus === 'HEALTHY'
      ? rawStatus
      : 'ALL';
  const query = firstValue(params.q).trim().slice(0, 160);
  const prisma = getPrisma();
  const [radar, availableCourses] = await Promise.all([
    getStudentHealthRadarPage({
      gradeLevel,
      page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
      query,
      status,
    }),
    prisma.course.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
  ]);
  const accessRows = await prisma.user.findMany({
    where: { id: { in: radar.students.map(({ id }) => id) } },
    select: {
      enrollments: { select: { courseId: true } },
      id: true,
      studentSubscriptions: { select: { courseId: true, status: true } },
    },
  });
  const accessByStudentId = new Map(accessRows.map((row) => [row.id, row]));
  const students: RadarStudent[] = radar.students.map((score) => ({
    assignmentScore: score.assignmentScore,
    enrolledCourseIds:
      accessByStudentId.get(score.id)?.enrollments.map(({ courseId }) => courseId) ?? [],
    gradeLevel: score.gradeLevel,
    healthPercentage: score.healthPercentage,
    id: score.id,
    isAtRisk: score.isAtRisk,
    lastLoginAt: score.lastLoginAt.toISOString(),
    name: score.name,
    phoneNumber: score.phoneNumber,
    role: 'STUDENT',
    status: 'ACTIVE',
    subscriptions:
      accessByStudentId.get(score.id)?.studentSubscriptions ?? [],
    videoCompletion: score.videoCompletion,
  }));

  return (
    <PortalShell user={admin}>
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Activity className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-700">
          <ShieldCheck className="size-4" aria-hidden="true" />
          70% engagement threshold
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Student activity radar
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Health combines recent activity (30%), video completion (40%), and
          quiz/homework submission completion (30%).
        </p>
      </header>
      <StudentRadar
        atRiskCount={radar.atRiskCount}
        availableCourses={availableCourses}
        currentAdminRole={admin.role}
        filteredCount={radar.filteredCount}
        filters={{
          grade: gradeLevel ?? 'ALL',
          query,
          status,
        }}
        healthyCount={radar.healthyCount}
        page={radar.page}
        pageCount={radar.pageCount}
        students={students}
        totalStudents={radar.totalStudents}
      />
    </PortalShell>
  );
}
