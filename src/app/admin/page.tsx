import { auth } from '@/auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { getAllSubjects } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';
import { getLmsUserWithoutActiveSessionCheck } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import Navbar from '@/components/Navbar';
import { PortalShell } from '@/components/erp/PortalShell';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { MobileDock } from '@/components/navigation/mobile-dock';
import { WorkspaceActionHub } from '@/components/navigation/workspace-action-hub';
import AdminClient from './AdminClient';
import AnalyticsPanel from './AnalyticsPanel';

export default async function AdminPage() {
  const [session, lmsUser] = await Promise.all([
    auth(),
    getLmsUserWithoutActiveSessionCheck(),
  ]);
  const lmsAdmin = lmsUser && isAdminRole(lmsUser.role) ? lmsUser : null;
  const isLegacyAdmin = Boolean(
    session &&
      (session.user?.isAdmin || isMasterAdmin(session.user?.email)),
  );

  if (!lmsAdmin && !isLegacyAdmin) {
    redirect('/dashboard');
  }

  const adminRole = lmsAdmin?.role ??
    (isMasterAdmin(session?.user?.email) ? 'SUPER_ADMIN' : 'ADMIN');
  const adminEmail = lmsAdmin?.email ?? session?.user?.email ?? '';
  const adminName = lmsAdmin?.name ?? session?.user?.name ?? undefined;

  const threeDaysAgo = new Date();
  threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

  // Fetch all concurrent Admin Data before rendering
  const [subjects, { data: roles }, { data: allLogs }, { data: historicalLogs }, { data: liveSessions }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('user_roles').select('*'),
    supabaseAdmin.from('activity_logs').select('user_email'),
    supabaseAdmin.from('activity_logs').select('*')
      .gt('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(2000),
    supabaseAdmin.from('live_sessions').select('*').order('last_active_at', { ascending: false }).limit(200)
  ]);

  // Merge legacy users who interacted with the platform before the internal `user_roles` table existed
  const historicalEmails = [...new Set((allLogs || []).map(l => l.user_email))];
  const mergedRoles = [...(roles || [])];
  
  historicalEmails.forEach(email => {
    if (email && !mergedRoles.some(r => r.email === email)) {
      mergedRoles.push({ email, role: 'student' });
    }
  });

  const workspace = (
    <>
      <WorkspaceActionHub mode="admin" userName={adminName} />

      <AdminClient
        subjects={subjects}
        initialRoles={mergedRoles}
        userEmail={adminEmail}
        initialLogs={historicalLogs || []}
        initialSessions={liveSessions || []}
      />

      <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            Learning overview
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Course activity
          </h2>
        </div>
        <AnalyticsPanel />
      </section>
    </>
  );

  // Supabase-authenticated LMS administrators use the LMS shell so navigation
  // and sign-out operate on the same session that authorized the page. Keep the
  // legacy shell only for existing NextAuth administrators.
  if (lmsAdmin) {
    return <PortalShell user={lmsAdmin}>{workspace}</PortalShell>;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#05050A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(0,0,0,0))] text-white">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

      <div className="relative z-10">
        <Navbar
          userName={session?.user?.name ?? undefined}
          userImage={session?.user?.image ?? undefined}
          isAdmin={session?.user?.isAdmin}
          roleLabel={adminRole}
        />

        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-start gap-6 px-4 py-6 sm:px-6">
          <AppSidebar role={adminRole} />
          <main className="flex min-w-0 flex-1 flex-col gap-6 pb-24 md:pb-12">
            <Breadcrumbs role={adminRole} />
            {workspace}
          </main>
        </div>
        <MobileDock role={adminRole} />
      </div>
    </div>
  );
}
