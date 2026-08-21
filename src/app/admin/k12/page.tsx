import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import { K12Manager } from '@/app/admin/k12/K12Manager';
import { PortalShell } from '@/components/erp/PortalShell';
import { getK12ManagerData } from '@/lib/lms/k12';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { ADMIN_ROLES } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';

export default async function K12AdminPage() {
  const admin = await requireLmsPageRole(ADMIN_ROLES, 'admin-required');
  const data = await getK12ManagerData();

  return (
    <PortalShell user={admin}>
        <nav className="flex w-full min-w-0 items-center justify-between gap-3">
          <Link
            className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B] hover:shadow-md"
            href="/dashboard"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Dashboard</span>
          </Link>
          <Link
            className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B] hover:shadow-md"
            href="/admin/radar"
          >
            <Radar className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Activity radar</span>
          </Link>
        </nav>

        <header className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#084B2B] shadow-sm">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Admin only
            </span>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#084B2B]">
            K–12 academic hierarchy
          </p>
          <h1 className="mt-2 break-words text-3xl font-black tracking-tight">
            Grade and subject control.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Assign one primary teacher to each core subject and organize student
            accounts from Grade 1 through Grade 12.
          </p>
        </header>

        <K12Manager
          initialGrades={data.grades}
          initialStudents={data.students}
          teachers={data.teachers}
        />
    </PortalShell>
  );
}
