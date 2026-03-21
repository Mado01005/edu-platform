import { supabaseAdmin } from '@/lib/supabase';

export default async function AnalyticsPanel() {
  // Fetch the latest 50 activity logs securely on the server
  const { data: logs, error } = await supabaseAdmin
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return <div className="text-red-400 p-4 bg-red-500/10 rounded-xl mt-8">Failed to load analytics: {error.message}</div>;
  }

  // Derived Metrics
  const uniqueStudents = new Set(logs?.map((l: any) => l.user_email)).size;
  const totalInteractions = logs?.length || 0;
  
  const moduleCounts: Record<string, number> = {};
  logs?.forEach((l: any) => {
    if (l.action === 'Viewed Lesson' && l.details?.lessonSlug) {
      moduleCounts[l.details.lessonSlug] = (moduleCounts[l.details.lessonSlug] || 0) + 1;
    }
  });
  const sortedModules = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]);
  const topModule = sortedModules.length > 0 ? sortedModules[0][0].replace(/-/g, ' ') : 'N/A';

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Recent Student Activity
      </h2>

      {/* STATS WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Unique Students</p>
          <p className="text-3xl font-bold text-white">{uniqueStudents}</p>
        </div>

        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Interactions</p>
          <p className="text-3xl font-bold text-white">{totalInteractions}</p>
        </div>

        <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1">Top Module</p>
          <p className="text-xl font-bold text-white truncate capitalize">{topModule}</p>
        </div>
      </div>
      
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#1A1A1E] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No activity recorded yet.</td>
                </tr>
              )}
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{log.user_name}</div>
                    <div className="text-xs text-gray-500">{log.user_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.details && Object.entries(log.details).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-gray-500">{k}:</span> <span className="text-indigo-300">{String(v)}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
