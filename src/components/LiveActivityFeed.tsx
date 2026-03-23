'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface LiveActivityFeedProps {
  initialLogs: any[];
}

type HudTab = 'feed' | 'grid' | 'audit' | 'shadow';

export default function LiveActivityFeed({ initialLogs }: LiveActivityFeedProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [hudTab, setHudTab] = useState<HudTab>('feed');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [shadowTarget, setShadowTarget] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');

  useEffect(() => {
    const channel = supabase
      .channel('realtime_activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          setLogs(prev => [payload.new, ...prev].slice(0, 500));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Derived data
  const uniqueStudents = useMemo(() => {
    const map = new Map();
    logs.forEach((l: any) => {
      if (!map.has(l.user_email)) {
        map.set(l.user_email, {
          email: l.user_email,
          name: l.user_name || l.user_email.split('@')[0],
          lastAction: l.action,
          lastPage: l.url || l.details?.lessonSlug || 'Unknown',
          lastSeen: l.created_at,
          actionCount: 0,
          completions: 0,
          logins: 0,
          pdfReads: 0,
          videoWatches: 0,
        });
      }
      const student = map.get(l.user_email);
      student.actionCount++;
      if (l.action === 'Completed Lesson') student.completions++;
      if (l.action === 'USER_LOGIN') student.logins++;
      if (l.action === 'READ_PDF') student.pdfReads++;
      if (l.action === 'WATCH_VIDEO') student.videoWatches++;
    });
    return Array.from(map.values());
  }, [logs]);

  const totalInteractions = logs.length;
  const uniqueCount = uniqueStudents.length;

  // Active students = seen in last 15 minutes
  const activeStudents = useMemo(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    return uniqueStudents.filter(s => new Date(s.lastSeen).getTime() > cutoff);
  }, [uniqueStudents]);

  // Shadow mode logs
  const shadowLogs = useMemo(() => {
    if (!shadowTarget) return [];
    return logs.filter((l: any) => l.user_email === shadowTarget);
  }, [logs, shadowTarget]);

  // Audit log with filters
  const filteredAuditLogs = useMemo(() => {
    return logs.filter((l: any) => {
      if (auditSearch && !l.user_email?.toLowerCase().includes(auditSearch.toLowerCase()) && !l.user_name?.toLowerCase().includes(auditSearch.toLowerCase())) return false;
      if (auditAction && l.action !== auditAction) return false;
      return true;
    });
  }, [logs, auditSearch, auditAction]);

  const allActions = useMemo(() => [...new Set(logs.map((l: any) => l.action))], [logs]);

  const exportCSV = () => {
    const header = 'Timestamp,Student,Email,Action,Details,URL\n';
    const rows = filteredAuditLogs.map((l: any) =>
      `"${new Date(l.created_at).toISOString()}","${l.user_name || ''}","${l.user_email}","${l.action}","${JSON.stringify(l.details || {}).replace(/"/g, '""')}","${l.url || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const timeAgo = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const actionColor = (action: string) => {
    if (action === 'USER_LOGIN') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action === 'Completed Lesson') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (action === 'READ_PDF') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    if (action === 'WATCH_VIDEO') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  return (
    <div className="fade-in">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-black text-white flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
          </div>
          GOD MODE — COMMAND CENTER
        </h2>
        <div className="flex gap-1 bg-black/40 rounded-xl p-1 border border-white/10">
          {([['feed', '📡 Feed'], ['grid', '🖥️ Grid'], ['audit', '📋 Audit'], ['shadow', '🎯 Shadow']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setHudTab(key)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${hudTab === key ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1A1A1E]/80 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Now</p>
          <p className="text-2xl font-black text-green-400">{activeStudents.length}</p>
        </div>
        <div className="bg-[#1A1A1E]/80 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Students</p>
          <p className="text-2xl font-black text-white">{uniqueCount}</p>
        </div>
        <div className="bg-[#1A1A1E]/80 border border-white/5 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Interactions</p>
          <p className="text-2xl font-black text-indigo-400">{totalInteractions}</p>
        </div>
      </div>

      {/* Student Dossier Side Panel */}
      {selectedStudent && (() => {
        const s = uniqueStudents.find(st => st.email === selectedStudent);
        if (!s) return null;
        return (
          <div className="fixed inset-0 z-[200] flex justify-end" onClick={() => setSelectedStudent(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div className="relative w-full max-w-md bg-[#0A0A0F] border-l border-white/10 h-full overflow-y-auto p-6 animate-slide-in-right" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2">🔍 STUDENT DOSSIER</h3>
                <button onClick={() => setSelectedStudent(null)} className="text-gray-500 hover:text-white p-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-white shadow-lg">{s.name.charAt(0).toUpperCase()}</div>
                <h4 className="text-lg font-bold text-white">{s.name}</h4>
                <p className="text-xs text-gray-500 font-mono">{s.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-2xl font-black text-green-400">{s.completions}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Completions</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-2xl font-black text-blue-400">{s.logins}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Logins</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-2xl font-black text-yellow-400">{s.pdfReads}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">PDFs Read</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-2xl font-black text-purple-400">{s.videoWatches}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Videos</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-6">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Last Active</p>
                <p className="text-sm text-white font-mono">{new Date(s.lastSeen).toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 mt-1">({timeAgo(s.lastSeen)})</p>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-400 font-bold uppercase mb-3">Recent Activity Stream</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {logs.filter((l: any) => l.user_email === s.email).slice(0, 20).map((l: any, i: number) => (
                    <div key={l.id || i} className="flex items-center gap-3 text-xs bg-black/30 rounded-lg p-2 border border-white/5">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${actionColor(l.action)}`}>{l.action.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500 truncate">{l.details?.lessonSlug || l.details?.pdf_title || ''}</span>
                      <span className="text-gray-600 ml-auto shrink-0 font-mono">{timeAgo(l.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => { setShadowTarget(s.email); setSelectedStudent(null); setHudTab('shadow'); }} className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition">
                🎯 Activate Shadow Mode
              </button>
            </div>
          </div>
        );
      })()}

      {/* ===== TAB: LIVE FEED ===== */}
      {hudTab === 'feed' && (
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
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">Standby... No activity recorded.</td></tr>
                )}
                {logs.slice(0, 50).map((log: any) => (
                  <tr key={log.id} className="hover:bg-indigo-500/5 transition-all group cursor-pointer" onClick={() => setSelectedStudent(log.user_email)}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white group-hover:text-indigo-300 transition">{log.user_name || log.user_email.split('@')[0]}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{log.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${actionColor(log.action)}`}>{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.details ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(log.details).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              <span className="text-gray-500">{k}:</span> <span className="text-indigo-200">{String(v).substring(0, 30)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-gray-600 italic text-[10px]">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-[10px] text-gray-500 font-mono">{timeAgo(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB: SURVEILLANCE GRID ===== */}
      {hudTab === 'grid' && (
        <div>
          <p className="text-xs text-gray-500 mb-4">{activeStudents.length} active in last 15 minutes • {uniqueCount} total unique students</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uniqueStudents.map(student => {
              const isOnline = new Date(student.lastSeen).getTime() > Date.now() - 15 * 60 * 1000;
              return (
                <div key={student.email} onClick={() => setSelectedStudent(student.email)} className={`bg-[#1A1A1E]/80 border rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${isOnline ? 'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/5'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center font-bold text-white text-sm">{student.name.charAt(0).toUpperCase()}</div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1A1A1E] ${isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]' : 'bg-gray-600'}`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{student.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] mb-2">
                    <span className={`px-1.5 py-0.5 rounded border font-bold uppercase ${actionColor(student.lastAction)}`}>{student.lastAction.replace(/_/g, ' ')}</span>
                    <span className="text-gray-600 ml-auto">{timeAgo(student.lastSeen)}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-gray-500">
                    <span>📚 {student.completions}</span>
                    <span>📄 {student.pdfReads}</span>
                    <span>🎬 {student.videoWatches}</span>
                    <span>🔗 {student.actionCount} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TAB: AUDIT LOG ===== */}
      {hudTab === 'audit' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input type="text" placeholder="🔍 Search by student name or email..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="flex-1 bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <select value={auditAction} onChange={e => setAuditAction(e.target.value)} className="bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Actions</option>
              {allActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={exportCSV} className="px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/20 transition shrink-0">
              📥 Export CSV
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">{filteredAuditLogs.length} records found</p>
          <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1A1A1E] sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-widest text-gray-400">Timestamp</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-widest text-gray-400">Student</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-widest text-gray-400">Action</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-widest text-gray-400">Details</th>
                    <th className="px-4 py-3 font-bold uppercase text-[9px] tracking-widest text-gray-400">Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAuditLogs.slice(0, 100).map((log: any, i: number) => (
                    <tr key={log.id || i} className="hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedStudent(log.user_email)}>
                      <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                      <td className="px-4 py-3"><span className="text-white font-medium">{log.user_name || log.user_email.split('@')[0]}</span></td>
                      <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${actionColor(log.action)}`}>{log.action}</span></td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{log.details ? JSON.stringify(log.details).substring(0, 50) : '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate font-mono">{log.url?.split('/').pop() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: SHADOW MODE ===== */}
      {hudTab === 'shadow' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <select value={shadowTarget || ''} onChange={e => setShadowTarget(e.target.value || null)} className="flex-1 bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none">
              <option value="">— Select target to shadow —</option>
              {uniqueStudents.map(s => <option key={s.email} value={s.email}>{s.name} ({s.email})</option>)}
            </select>
            {shadowTarget && (
              <button onClick={() => setShadowTarget(null)} className="px-4 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm font-bold hover:bg-white/10 transition">
                ✕ End Shadow
              </button>
            )}
          </div>

          {!shadowTarget ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-lg font-bold text-gray-400">Shadow Mode</p>
              <p className="text-sm mt-1">Select a student above to watch their every move in real-time.</p>
            </div>
          ) : (
            <div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4 flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                <p className="text-sm text-red-300 font-bold">SHADOWING: {shadowTarget}</p>
                <p className="text-xs text-red-400/60 ml-auto">{shadowLogs.length} events captured</p>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {shadowLogs.length === 0 && <p className="text-center py-12 text-gray-500 italic">Waiting for target activity...</p>}
                {shadowLogs.map((log: any, i: number) => (
                  <div key={log.id || i} className="bg-[#1A1A1E]/80 border border-white/5 rounded-xl p-4 flex items-start gap-4 hover:bg-white/5 transition">
                    <div className="shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${actionColor(log.action)}`}>{log.action.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-gray-600 font-mono ml-auto">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      {log.details && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(log.details).map(([k, v]) => (
                            <span key={k} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400">{k}: <span className="text-white">{String(v).substring(0, 40)}</span></span>
                          ))}
                        </div>
                      )}
                      {log.url && <p className="text-[10px] text-gray-600 mt-1 font-mono truncate">{log.url}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
