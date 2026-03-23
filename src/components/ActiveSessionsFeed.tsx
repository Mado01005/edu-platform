'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Session {
  id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  current_page: string;
  is_idle: boolean;
  last_active_at: string;
}

export default function ActiveSessionsFeed() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch of active sessions
    const fetchOnline = async () => {
      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .order('last_active_at', { ascending: false });
      if (data) setSessions(data);
    };
    fetchOnline();

    // Listen for Real-Time updates on the sessions table
    const channel = supabase
      .channel('realtime_live_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        (payload) => {
          console.log('Session Update:', payload);
          setSessions(prev => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               const newData = payload.new as Session;
               if (!newData || !newData.id) return prev;
               
               const existingIndex = prev.findIndex(s => s.id === newData.id);
               if (existingIndex !== -1) {
                 const updated = [...prev];
                 updated[existingIndex] = newData;
                 return updated.sort((a,b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
               } else {
                 return [newData, ...prev].sort((a,b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
               }
            } else if (payload.eventType === 'DELETE') {
               const oldData = payload.old as { id: string };
               if (!oldData || !oldData.id) return prev;
               return prev.filter(s => s.id !== oldData.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute Anti-Piracy Alerts
  // Detect if a user has multiple active sessions from different IPs within the last 5 minutes
  const activeSessions = sessions.filter(s => new Date(s.last_active_at).getTime() > Date.now() - 5 * 60000 && !s.is_idle);
  const userIpCounts: Record<string, Set<string>> = {};
  
  activeSessions.forEach(s => {
    if (!userIpCounts[s.user_email]) userIpCounts[s.user_email] = new Set();
    userIpCounts[s.user_email].add(s.ip_address);
  });
  
  const piracyAlerts = Object.entries(userIpCounts)
    .filter(([_, ips]) => ips.size > 1)
    .map(([email, ips]) => ({ email, ips: Array.from(ips) }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            God Mode: Live Telemetry
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time tracker of all connected network users and their location.</p>
        </div>
        <div className="text-right">
           <p className="text-3xl font-black text-white">{activeSessions.length}</p>
           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Online Now</p>
        </div>
      </div>

      {/* Modern Connected Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sessions.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400 italic bg-white/5 rounded-xl border border-white/10">No users connected.</div>
        )}
        {sessions.map(session => (
          <div key={session.id} className="relative bg-[#1A1A1E] border border-white/5 rounded-2xl p-5 shadow-xl hover:bg-white/5 transition duration-300 overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="font-bold text-white text-sm break-all">{session.user_email}</p>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 max-w-[200px] truncate" title={session.user_agent}>{session.user_agent.split(' ')[0]}</p>
               </div>
               {session.is_idle ? (
                 <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-[10px] font-black tracking-widest uppercase rounded">Idle</span>
               ) : (
                 <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-black tracking-widest uppercase rounded">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                 </span>
               )}
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 <span className="text-xs text-indigo-200 truncate" title={session.current_page}>{session.current_page}</span>
              </div>
              <div className="flex items-center gap-2">
                 <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <span className="text-xs text-gray-400 font-mono tracking-tighter">{session.ip_address}</span>
              </div>
            </div>
            
            <p className="text-[9px] text-gray-600 text-right mt-3 font-mono">
              PING: {new Date(session.last_active_at).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
