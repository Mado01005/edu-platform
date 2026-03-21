import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import SubjectCard from '@/components/SubjectCard';
import SupportTicketModal from '@/components/SupportTicketModal';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [subjects, { data: completedLogs }, { data: globalMsg }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('activity_logs').select('details').eq('action', 'Completed Lesson').eq('user_email', session.user?.email || ''),
    supabaseAdmin.from('announcements').select('message').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
  ]);

  const completedSet = new Set(completedLogs?.map(l => `${l.details?.subjectSlug}-${l.details?.lessonSlug}`));

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
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
        <div className="mb-10 fade-in">
          <p className="text-indigo-400 text-sm font-medium mb-2">
            Welcome back, {session.user?.name?.split(' ')[0]} 👋
          </p>
          <h1 className="text-4xl font-bold text-white mb-3">Your Courses</h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Select a subject below to explore lessons, videos, and reading materials.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="glass-card rounded-xl px-5 py-4">
            <p className="text-2xl font-bold text-white">{subjects.length}</p>
            <p className="text-sm text-gray-400 mt-0.5">Subjects</p>
          </div>
          <div className="glass-card rounded-xl px-5 py-4">
            <p className="text-2xl font-bold text-white">
              {subjects.reduce((acc, s) => acc + s.lessons.length, 0)}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">Lessons</p>
          </div>
          <div className="glass-card rounded-xl px-5 py-4 hidden sm:block">
            <p className="text-2xl font-bold text-white">
              {subjects.reduce((acc, s) => acc + s.lessons.filter((l) => l.hasVideo).length, 0)}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">Videos</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
      </main>
    </div>
  );
}
