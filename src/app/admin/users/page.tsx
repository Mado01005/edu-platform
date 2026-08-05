import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import {
  type AdminUserRecord,
  UserManagementConsole,
} from '@/app/admin/users/UserManagementConsole';
import { AdminStorageWidget } from '@/components/Admin/AdminStorageWidget';
import { listAllSupabaseAuthUsers } from '@/lib/lms/admin-users';
import { requireAdminPage } from '@/lib/lms/auth';
import { getPrisma } from '@/lib/prisma';
import { getR2StorageSnapshot } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdminPage();
  const users = await getPrisma().user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      _count: { select: { enrollments: true } },
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
      status: true,
      supabaseId: true,
    },
  });

  let authStatusAvailable = true;
  let storageSnapshot: Awaited<
    ReturnType<typeof getR2StorageSnapshot>
  > | null = null;
  let authUsersById = new Map<
    string,
    Awaited<ReturnType<typeof listAllSupabaseAuthUsers>>[number]
  >();

  try {
    const authUsers = await listAllSupabaseAuthUsers();
    authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  } catch (error) {
    authStatusAvailable = false;
    console.error('[LMS_ADMIN_USER_DIRECTORY]', error);
  }

  try {
    storageSnapshot = await getR2StorageSnapshot(0);
  } catch (error) {
    console.error('[LMS_ADMIN_STORAGE_WIDGET]', error);
  }

  const records: AdminUserRecord[] = users.map((user) => {
    const authUser = authUsersById.get(user.supabaseId);
    const avatarCandidate =
      authUser?.user_metadata?.avatar_url ??
      authUser?.user_metadata?.picture;

    return {
      authPresent: Boolean(authUser),
      avatarUrl:
        typeof avatarCandidate === 'string' ? avatarCandidate : null,
      createdAt: user.createdAt.toISOString(),
      email: user.email,
      emailConfirmed: Boolean(authUser?.email_confirmed_at),
      enrolledCourses: user._count.enrollments,
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  });

  return (
    <PortalShell user={admin}>
        <Link
          className="flex w-fit items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
          href="/dashboard"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>

        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.25),transparent_55%)] p-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-400 text-black shadow-lg shadow-violet-500/20">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
            Administrator console
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            User management
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Search accounts, review access, and manage LMS roles without
            leaving the learning workspace.
          </p>
        </header>

        {storageSnapshot ? (
          <AdminStorageWidget
            fileCount={storageSnapshot.fileCount}
            quotaBytes={storageSnapshot.quotaBytes}
            totalBytes={storageSnapshot.totalBytes}
          />
        ) : null}

        <UserManagementConsole
          authStatusAvailable={authStatusAvailable}
          currentAdminId={admin.id}
          currentAdminRole={admin.role}
          initialUsers={records}
        />
    </PortalShell>
  );
}
