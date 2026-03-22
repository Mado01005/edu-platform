import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import SubjectCard from '@/components/SubjectCard';
import SupportTicketModal from '@/components/SupportTicketModal';
import PromotionModal from '@/components/PromotionModal';
import StudentWelcomeModal from '@/components/StudentWelcomeModal';
import DashboardLogger from '@/components/DashboardLogger';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [subjects, { data: completedLogs }, { data: globalMsg }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('activity_logs').select('details').eq('action', 'Completed Lesson').eq('user_email', session.user?.email || ''),
    supabaseAdmin.from('announcements').select('message').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  const completedSet = new Set(completedLogs?.map(l => `${l.details?.subjectSlug}-${l.details?.lessonSlug}`));

  // Check if they are a newly promoted instructor who hasn't acknowledged it yet
  let showPromotionModal = false;
  // @ts-ignore
  if (session.user?.isAdmin) {
    const { data: promoLog } = await supabaseAdmin
      .from('activity_logs')
      .select('id')
      .eq('user_email', session.user.email || '')
      .eq('action', 'Viewed Promotion Modal')
      .limit(1);
    
    if (!promoLog || promoLog.length === 0) {
      showPromotionModal = true;
    }
  }

  // Check if they are a brand new Student who hasn't completed the First-Boot Onboarding
  let showStudentWelcomeModal = false;
  // @ts-ignore
  if (!session.user?.isAdmin) {
    const { data: welcomeLog } = await supabaseAdmin
      .from('activity_logs')
      .select('id')
      .eq('user_email', session.user?.email || '')
      .eq('action', 'Completed Student Onboarding')
      .limit(1);
    
    if (!welcomeLog || welcomeLog.length === 0) {
      showStudentWelcomeModal = true;
    }
  }

  return (
    <div className="min-h-screen bg-[#05050A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(0,0,0,0))] relative overflow-hidden">
      <DashboardLogger />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10">
      <Navbar
        userName={session.user?.name ?? undefined}
        userImage={session.user?.image ?? undefined}
        // @ts-ignore
        isAdmin={session.user?.isAdmin}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Global Announcement Banner */}
        {globalMsg?.message && (
          <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-4 shadow-lg shadow-indigo-500/5 fade-in">
            <div className="p-2 bg-indigo-500/20 rounded-xl shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
            </div>
            <div className="flex-1 font-medium text-white tracking-wide text-[15px] leading-relaxed">
              {globalMsg.message}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-12 fade-in mt-4">
          <p className="text-indigo-400 text-sm font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></span>
            Welcome back, {session.user?.name?.split(' ')[0]} 👋
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 tracking-tight mb-4 select-none">
            Your Courses
          </h1>
          <p className="text-gray-400 text-lg max-w-xl font-medium">
            Select a subject below to explore interactive lessons, videos, and native reading materials.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mb-14 fade-in scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-6 py-5 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <p className="text-3xl font-black text-white drop-shadow-md mb-1">{subjects.length}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Subjects</p>
          </div>
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-6 py-5 shadow-xl relative overflow-hidden group">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            <p className="text-3xl font-black text-white drop-shadow-md mb-1">
              {subjects.reduce((acc, s) => acc + s.lessons.length, 0)}
            </p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Lessons</p>
          </div>
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-6 py-5 shadow-xl relative overflow-hidden group hidden sm:block">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition-all duration-500"></div>
            <p className="text-3xl font-black text-white drop-shadow-md mb-1">
              {subjects.reduce((acc, s) => acc + s.lessons.filter((l) => l.hasVideo).length, 0)}
            </p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">HD Videos</p>
          </div>
        </div>

        {/* Subject grid */}
        {subjects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-medium">No subjects found</p>
            <p className="text-sm mt-2">
              Courses are currently syncing or none have been added yet. Use the <strong className="text-indigo-400">Admin Panel</strong> to create course folders.
            </p>
            <div className="mt-8 text-xs text-gray-600 bg-white/5 inline-block p-4 rounded-xl text-left">
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
        <SupportTicketModal />
        <PromotionModal open={showPromotionModal} userEmail={session.user?.email || ''} />
        <StudentWelcomeModal open={showStudentWelcomeModal} userEmail={session.user?.email || ''} userName={session.user?.name || 'Student'} />
      </main>
      </div>
    </div>
  );
}
