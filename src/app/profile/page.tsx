import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllSubjects } from '@/lib/content';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect('/login');

  const userEmail = session.user?.email || '';
  const userName = session.user?.name || 'Student';

  // Fetch all analytics in parallel
  const [subjects, { data: allLogs }, { data: completedLogs }] = await Promise.all([
    getAllSubjects(),
    supabaseAdmin.from('activity_logs').select('action, created_at, details').eq('user_email', userEmail).order('created_at', { ascending: false }),
    supabaseAdmin.from('activity_logs').select('details, created_at').eq('action', 'Completed Lesson').eq('user_email', userEmail),
  ]);

  // Compute stats
  const totalLessons = subjects.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedCount = completedLogs?.length || 0;
  const completionRate = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Video watch stats
  const videoLogs = (allLogs || []).filter(l => l.action === 'WATCHED_VIDEO');
  const totalVideosWatched = videoLogs.length;
  const totalSecondsWatched = videoLogs.reduce((acc, l) => acc + (l.details?.seconds_watched || 0), 0);
  const totalHoursWatched = (totalSecondsWatched / 3600).toFixed(1);

  // PDF read stats
  const pdfLogs = (allLogs || []).filter(l => l.action === 'READ_PDF');
  const totalPdfsRead = pdfLogs.length;
  const totalPdfSeconds = pdfLogs.reduce((acc, l) => acc + (l.details?.active_seconds || 0), 0);
  const totalPdfMinutes = Math.round(totalPdfSeconds / 60);

  // Activity heatmap (last 12 weeks)
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
  const recentLogs = (allLogs || []).filter(l => new Date(l.created_at) >= twelveWeeksAgo);
  
  // Build day counts
  const dayCounts: Record<string, number> = {};
  recentLogs.forEach(log => {
    const day = new Date(log.created_at).toISOString().split('T')[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  // Generate 84 days grid
  const heatmapDays: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    heatmapDays.push({ date: dateStr, count: dayCounts[dateStr] || 0, dayOfWeek: d.getDay() });
  }

  const maxCount = Math.max(...heatmapDays.map(d => d.count), 1);

  function getHeatColor(count: number) {
    if (count === 0) return 'bg-white/5';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-indigo-900/60';
    if (intensity < 0.5) return 'bg-indigo-700/70';
    if (intensity < 0.75) return 'bg-indigo-500/80';
    return 'bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)]';
  }

  // Recent activity (last 10)
  const recentActivity = (allLogs || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-[#05050A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(0,0,0,0))] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10">
        <Navbar
          userName={session.user?.name ?? undefined}
          userImage={session.user?.image ?? undefined}
          isAdmin={(session.user as any)?.isAdmin}
        />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Profile Header */}
          <div className="text-center mb-12 fade-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] border-2 border-white/20 mb-5">
              {userName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 tracking-tight mb-2">
              {userName}
            </h1>
            <p className="text-gray-400 text-sm font-medium">{userEmail}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-5 py-5 text-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition"></div>
              <p className="text-3xl font-black text-white mb-1">{completedCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lessons Done</p>
            </div>
            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-5 py-5 text-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition"></div>
              <p className="text-3xl font-black text-white mb-1">{completionRate}%</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Completion</p>
            </div>
            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-5 py-5 text-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition"></div>
              <p className="text-3xl font-black text-white mb-1">{totalHoursWatched}h</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Video Time</p>
            </div>
            <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl px-5 py-5 text-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition"></div>
              <p className="text-3xl font-black text-white mb-1">{totalPdfMinutes}m</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reading Time</p>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 mb-12 fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                Activity Heatmap
              </h2>
              <p className="text-xs text-gray-500 font-medium">Last 12 weeks</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {heatmapDays.map((day, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm ${getHeatColor(day.count)} transition-all duration-300 hover:scale-150 hover:rounded-md`}
                  title={`${day.date}: ${day.count} actions`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="text-[10px] text-gray-500">Less</span>
              <div className="w-3 h-3 rounded-sm bg-white/5"></div>
              <div className="w-3 h-3 rounded-sm bg-indigo-900/60"></div>
              <div className="w-3 h-3 rounded-sm bg-indigo-700/70"></div>
              <div className="w-3 h-3 rounded-sm bg-indigo-500/80"></div>
              <div className="w-3 h-3 rounded-sm bg-indigo-400"></div>
              <span className="text-[10px] text-gray-500">More</span>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No activity recorded yet. Start exploring your courses!</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      log.action === 'WATCHED_VIDEO' ? 'bg-blue-500/20 text-blue-400' :
                      log.action === 'READ_PDF' ? 'bg-pink-500/20 text-pink-400' :
                      log.action === 'Completed Lesson' ? 'bg-green-500/20 text-green-400' :
                      'bg-white/10 text-gray-400'
                    }`}>
                      {log.action === 'WATCHED_VIDEO' ? '▶' :
                       log.action === 'READ_PDF' ? '📄' :
                       log.action === 'Completed Lesson' ? '✓' : '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {log.action === 'WATCHED_VIDEO' ? `Watched: ${log.details?.video_title || 'Video'}` :
                         log.action === 'READ_PDF' ? `Read: ${log.details?.pdf_title || 'PDF'}` :
                         log.action === 'Completed Lesson' ? `Completed: ${log.details?.lessonSlug || 'Lesson'}` :
                         log.action}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 text-center fade-in">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-bold transition">
              ← Back to Dashboard
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
