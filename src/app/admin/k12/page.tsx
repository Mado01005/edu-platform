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
            className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            href="/dashboard"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Dashboard</span>
          </Link>
          <Link
            className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            href="/admin/radar"
          >
            <Radar className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Activity radar</span>
          </Link>
        </nav>

        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.28),transparent_58%)] p-5">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-300 text-black shadow-lg shadow-violet-500/20">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Admin only
            </span>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
            K–12 academic hierarchy
          </p>
          <h1 className="mt-2 break-words text-3xl font-black tracking-tight">
            Grade and subject control.
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
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
