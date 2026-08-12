import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import { isMasterAdmin } from '@/lib/constants';
import Navbar from '@/components/Navbar';
import SubjectCard from '@/components/SubjectCard';
import SupportTicketModal from '@/components/SupportTicketModal';
import PromotionModal from '@/components/PromotionModal';
import StudentWelcomeModal from '@/components/StudentWelcomeModal';
import DashboardLogger from '@/components/DashboardLogger';
import StreakBadge from '@/components/UI/StreakBadge';
import BookmarkedLessons from '@/components/BookmarkedLessons';
import WhatsNewBanner from '@/components/WhatsNewBanner';
import BadgeGallery from '@/components/UI/BadgeGallery';
import { checkAndUnlockAchievements } from '@/lib/achievements';
import { getLmsUser } from '@/lib/lms/auth';
import { StudentLmsDashboard } from '@/components/lms/StudentLmsDashboard';

export const dynamic = 'force-dynamic';

const LMS_NOTICE_MESSAGES: Record<string, string> = {
  'accounting-required': 'Accounting access is required for that page.',
  'admin-required': 'Administrator access is required for that page.',
  'role-required': 'Your account does not have access to that page.',
  'support-required': 'Support access is required for that page.',
  'teacher-required': 'Teacher access is required for that page.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const session = await auth();
  if (!session) {
    const lmsUser = await getLmsUser();
    if (lmsUser) {
      return (
        <StudentLmsDashboard
          notice={notice ? LMS_NOTICE_MESSAGES[notice] : undefined}
          user={lmsUser}
        />
      );
    }
    redirect('/login');
  }
  if (session.user?.isBanned) redirect('/banned');

  const [subjects, { data: completedLogs }, { data: globalMsg }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('activity_logs').select('details').eq('action', 'Completed Lesson').eq('user_email', (session.user?.email || '').toLowerCase()),
    supabaseAdmin.from('announcements').select('message').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const completedSet = new Set(completedLogs?.map(l => `${l.details?.subjectSlug}-${l.details?.lessonSlug}`));

  // Check if they are a newly promoted instructor who hasn't acknowledged it yet
  let showPromotionModal = false;
  if (session.user?.isAdmin) {
    const { data: promoLog } = await supabaseAdmin
      .from('activity_logs')
      .select('id')
      .eq('user_email', (session.user.email || '').toLowerCase())
      .eq('action', 'Viewed Promotion Modal')
      .limit(1);

    if (!promoLog || promoLog.length === 0) {
      showPromotionModal = true;
    }
  }

  // --- Unified Role Sync & Daily Streak Calculation ---
  let showStudentWelcomeModal = false;
  let currentStreak = (session.user as any)?.streakCount || 1; // fallback
  const email = (session.user?.email || '').toLowerCase();

  const { data: userData } = await supabaseAdmin
    .from('user_roles')
    .select('is_onboarded, streak_count, last_login')
    .eq('email', email)
    .maybeSingle();

  if (userData) {
    // 1. Onboarding check for students
    if (!(session.user as any)?.isAdmin && !userData.is_onboarded) {
      showStudentWelcomeModal = true;
    }

    // 2. Daily Streak Hydration
    // We fetch the current source-of-truth streak from the database.
    // The actual "Day Change" increment logic is now handled by the <DailyStreak /> component
    // on the client side via the /api/user/sync-streak route to ensure local timezone accuracy.
    currentStreak = userData.streak_count || 1;
    const now = new Date();

    // Perform achievement sync based on the current known state
    const { data: activityLogs } = await supabaseAdmin
      .from('activity_logs')
      .select('action')
      .eq('user_email', email);

    const completedCount = activityLogs?.filter(l => l.action === 'Completed Lesson').length || 0;

    await checkAndUnlockAchievements(email, {
      streakCount: currentStreak,
      completedCount,
      lastLoginAt: now.toISOString(),
      totalMinutes: 0
    });
  }

  // God mode override for top admin
  if (isMasterAdmin(email)) {
    currentStreak = Math.max(currentStreak, 365);
  }
  // ---------------------------------------------------

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900">
      <DashboardLogger />
      <div>
      <Navbar
        userName={session.user?.name ?? undefined}
        userImage={session.user?.image ?? undefined}
        isAdmin={session.user?.isAdmin}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">

        {/* Global Announcement Banner */}
        {globalMsg?.message && (
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm fade-in">
            <div className="mt-0.5 shrink-0 rounded-xl bg-sky-100 p-2">
              <svg className="h-5 w-5 text-sky-700" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            </div>
            <div className="min-w-0 flex-1 text-[15px] font-medium leading-relaxed text-slate-700">
              {globalMsg.message}
            </div>
          </div>
        )}

        {/* New Material Banner (separate from broadcast) */}
        <WhatsNewBanner />

        {/* Header */}
        <div className="mb-10 mt-4 fade-in">
          <p className="mb-3 flex min-w-0 flex-wrap items-center gap-3 text-sm font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
            Welcome back, {session.user?.name?.split(' ')[0]} 👋
            <StreakBadge count={currentStreak} />
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Your Courses
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Select a subject below to explore interactive lessons, videos, and native reading materials.
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-12 grid grid-cols-2 gap-4 fade-in scale-in sm:grid-cols-3" style={{ animationDelay: '0.1s' }}>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-50"></div>
            <p className="relative mb-1 text-3xl font-bold text-slate-900">{subjects.length}</p>
            <p className="relative text-xs font-semibold uppercase tracking-wider text-slate-500">Active Subjects</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-50"></div>
            <p className="relative mb-1 text-3xl font-bold text-slate-900">
              {subjects.reduce((acc, s) => acc + s.lessons.length, 0)}
            </p>
            <p className="relative text-xs font-semibold uppercase tracking-wider text-slate-500">Total Lessons</p>
          </div>
          <div className="relative hidden overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:block">
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-50"></div>
            <p className="relative mb-1 text-3xl font-bold text-slate-900">
              {subjects.reduce((acc, s) => acc + s.lessons.filter((l) => l.hasVideo).length, 0)}
            </p>
            <p className="relative text-xs font-semibold uppercase tracking-wider text-slate-500">HD Videos</p>
          </div>
        </div>

        {/* Profile Progress Card */}
        <a href="/profile" className="block mb-10 fade-in scale-in group" style={{ animationDelay: '0.15s' }}>
          <div className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">My Progress &amp; Activity</h3>
                <p className="mt-0.5 text-xs text-slate-500">View your study heatmap, video hours, and completion stats</p>
              </div>
            </div>
            <svg className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Bookmarked Lessons */}
        <BookmarkedLessons />

        {/* Global Achievements Section */}
        <div className="mb-14 fade-in scale-in" style={{ animationDelay: '0.2s' }}>
           <div className="mb-6 flex min-w-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">Identity Badges</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">Unlock credentials through consistent study.</p>
              </div>
              <div className="mx-4 hidden h-px flex-1 bg-slate-200 md:block"></div>
              <span className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-sky-700">Achievements</span>
           </div>
           <BadgeGallery />
        </div>

        {/* Subject grid */}
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-slate-500">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-medium">No subjects found</p>
            <p className="text-sm mt-2">
              Courses are currently syncing or none have been added yet. Use the <strong className="text-sky-700">Admin Panel</strong> to create course folders.
            </p>
            <div className="mt-8 inline-block rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-500">
              <p><strong>Vercel Connection Diagnostic:</strong></p>
              <p>URL loaded: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Yes' : '❌ No'}</p>
              <p>Anon Key loaded: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Yes' : '❌ No'}</p>
              <p>If you see ❌, you must add these to Vercel Settings &gt; Environment Variables, and click Redeploy.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in scale-in" style={{ animationDelay: '0.2s' }}>
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.slug}
                slug={subject.slug}
                title={subject.title}
                icon={subject.icon}
                color={subject.color}
                lessonCount={subject.lessons.length}
                completedCount={subject.lessons.filter(l => completedSet.has(`${subject.slug}-${l.slug}`)).length}
              />
            ))}
          </div>
        )}
        <PromotionModal open={showPromotionModal} userEmail={session.user?.email || ''} />
        <StudentWelcomeModal open={showStudentWelcomeModal} userEmail={session.user?.email || ''} userName={session.user?.name || 'Student'} />
        <SupportTicketModal />
      </main>
      </div>
    </div>
  );
}
