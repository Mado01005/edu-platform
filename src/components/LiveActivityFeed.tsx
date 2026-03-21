'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LiveActivityFeedProps {
  initialLogs: any[];
}

export default function LiveActivityFeed({ initialLogs }: LiveActivityFeedProps) {
  const [logs, setLogs] = useState(initialLogs);

  useEffect(() => {
    // 1. Listen for new Activity Logs in real-time
    const channel = supabase
      .channel('realtime_activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          console.log('New Activity Detected:', payload.new);
          // Add the new log to the top of the list
          setLogs(prev => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derived Metrics (Recalculated on every new log in real-time)
  const uniqueStudents = new Set(logs.map((l: any) => l.user_email)).size;
  const totalInteractions = logs.length;
  
  const moduleCounts: Record<string, number> = {};
  logs.forEach((l: any) => {
    if ((l.action === 'VIEW_LESSON' || l.action === 'Viewed Lesson') && l.details?.lessonSlug) {
      moduleCounts[l.details.lessonSlug] = (moduleCounts[l.details.lessonSlug] || 0) + 1;
    }
  });
  const sortedModules = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]);
  const topModule = sortedModules.length > 0 ? sortedModules[0][0].replace(/-/g, ' ') : 'N/A';

  return (
    <div className="mt-12 fade-in">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <div className="relative">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
        </div>
        Recent Student Activity (Live)
      </h2>

      {/* STATS WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1A1A1E]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1 font-mono">Unique Students</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{uniqueStudents}</p>
        </div>

        <div className="bg-[#1A1A1E]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1 font-mono">Global Interactions</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{totalInteractions}+</p>
        </div>

        <div className="bg-[#1A1A1E]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-1 font-mono">Trending Content</p>
          <p className="text-xl font-bold text-white truncate capitalize tracking-tight">{topModule}</p>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm text-gray-300 relative z-10">
            <thead className="bg-[#1A1A1E]/90 text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Subscriber</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Network Action</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Telemetry Data</th>
                <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">Standby... No activity recorded in the global registry.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-500/5 transition-all duration-300 group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">{log.user_name || log.user_email.split('@')[0]}</div>
                    <div className="text-[10px] text-gray-500 font-mono tracking-tighter">{log.user_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${
                      log.action === 'USER_LOGIN' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.details ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(log.details).map(([k, v]) => (
                          <div key={k} className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            <span className="text-gray-500 lowercase">{k}:</span> <span className="text-indigo-200">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-600 italic text-[10px]">No specific metadata</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-[10px] text-gray-500 font-mono">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
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
