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
          className="flex w-fit items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
          href="/admin/users"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to admin console
        </Link>

        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.22),transparent_55%)] p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300 text-black shadow-lg shadow-cyan-500/20">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            Cloudflare R2 monitor
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Storage health at a glance.
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Inspect exact bucket usage, understand file-type distribution, and
            remove unwanted objects with synchronized database cleanup.
          </p>
        </header>

        <StorageDashboard initialSnapshot={snapshot} />
    </PortalShell>
  );
}
