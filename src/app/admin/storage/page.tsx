import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { StorageDashboard } from '@/app/admin/storage/StorageDashboard';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireAdminPage } from '@/lib/lms/auth';
import { getR2StorageSnapshot } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
  const admin = await requireAdminPage();
  const snapshot = await getR2StorageSnapshot(100);

  return (
    <PortalShell user={admin}>
        <Link
          className="flex w-fit items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B] hover:shadow-md"
          href="/admin/users"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to admin console
        </Link>

        <header className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-[#084B2B] shadow-sm">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#084B2B]">
            Cloudflare R2 monitor
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Storage health at a glance.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Inspect exact bucket usage, understand file-type distribution, and
            remove unwanted objects with synchronized database cleanup.
          </p>
        </header>

        <StorageDashboard initialSnapshot={snapshot} />
    </PortalShell>
  );
}
