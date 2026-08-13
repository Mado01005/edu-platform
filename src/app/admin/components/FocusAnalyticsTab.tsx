'use client';

import React, { useEffect, useState } from 'react';

interface FrictionItem {
  lesson_id: string;
  title: string;
  completed: number;
  interrupted: number;
  totalDuration: number;
}

interface AnalyticsData {
  totalFocusMinutes: number;
  globalCompletionRate: number;
  frictionList: FrictionItem[];
}

interface FlaggedStudent {
  user_id: string;
  email: string;
  lesson_id: string;
  lesson_name: string;
  velocity_score: string;
  interrupt_rate: string;
  duration: number;
  global_average: string;
}

export default function FocusAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [velocityData, setVelocityData] = useState<FlaggedStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [velocityLoading, setVelocityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/focus-analytics')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    fetch('/api/admin/velocity')
      .then(res => res.json())
      .then(json => {
        if (json.data) setVelocityData(json.data);
        setVelocityLoading(false);
      })
      .catch(() => setVelocityLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-red-200/80 bg-red-50 p-4 text-red-700">Error: {error}</div>;
  }

  if (!data || (data.totalFocusMinutes === 0 && data.frictionList.length === 0)) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white py-20 text-center shadow-sm shadow-slate-200/50">
        <div className="text-6xl mb-4">🎧</div>
        <h3 className="mb-2 text-xl font-bold uppercase tracking-widest text-slate-900">Awaiting Student Data</h3>
        <p className="text-sm text-slate-600">Focus charts will appear here after students start study sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="space-y-2 max-w-2xl text-center md:text-left mx-auto md:mx-0">
        <h2 className="text-5xl font-black uppercase leading-none tracking-tighter text-slate-900">Productivity Pulse</h2>
        <p className="text-sm font-bold uppercase leading-relaxed tracking-widest text-sky-700">Focus Overview</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-sm shadow-slate-200/50">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Global Focus Time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tabular-nums text-slate-900">
              {Math.floor(data.totalFocusMinutes / 60)}
            </span>
            <span className="text-lg font-bold text-slate-500">hrs</span>
            <span className="text-5xl font-black tabular-nums text-slate-900">
              {data.totalFocusMinutes % 60}
            </span>
            <span className="text-lg font-bold text-slate-500">mins</span>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white p-8 shadow-sm shadow-slate-200/50">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Global Completion Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tabular-nums text-slate-900">
              {data.globalCompletionRate.toFixed(1)}
            </span>
            <span className="text-3xl font-bold text-sky-700">%</span>
          </div>
        </div>
      </div>

      {/* Friction Map */}
      <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="border-b border-slate-200/80 p-8">
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-slate-900">
            <span className="text-red-500">🔥</span> Content Friction Heatmap
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wider text-slate-600">Top lessons with highest interruption rates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <th className="p-6">Rank</th>
                <th className="p-6">Lesson Name</th>
                <th className="p-6 bg-red-950/20 text-red-500">Interrupts</th>
                <th className="p-6 text-emerald-500">Completions</th>
                <th className="p-6">Fail Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {(() => {
                try {
                  return data.frictionList.map((item, idx) => {
                    const total = item.completed + item.interrupted;
                    const failRate = total > 0 ? (item.interrupted / total) * 100 : 0;
                    
                    return (
                      <tr key={item.lesson_id} className="transition-colors hover:bg-slate-50">
                        <td className="p-6 flex items-center gap-2">
                          <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="max-w-xs truncate p-6 font-bold text-slate-900" title={item.title}>
                          {item.title}
                        </td>
                        <td className="p-6 font-black text-red-400 tabular-nums bg-red-950/20">{item.interrupted}</td>
                        <td className="p-6 font-bold text-emerald-400 tabular-nums">{item.completed}</td>
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <span className="w-12 font-bold tabular-nums text-slate-900">{failRate.toFixed(0)}%</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100">
                              <div className="h-full bg-red-500" style={{ width: `${failRate}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                } catch (e) {
                  console.error('Failed to render friction list:', e);
                  return null;
                }
              })()}
              {data.frictionList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center font-medium italic text-slate-500">No friction data recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Early Warning / Intervention Panel */}
      <div className="overflow-hidden rounded-[2.5rem] border border-red-200/80 bg-white shadow-sm shadow-slate-200/50">
        <div className="p-8 border-b border-red-500/20 flex justify-between items-center bg-red-950/10">
          <div>
             <h3 className="text-lg font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
               🚨 Early Warning System (Velocity Pulse)
             </h3>
             <p className="text-xs text-red-400/70 mt-1 uppercase tracking-wider">Flagged: High interruption rate + &gt;1.5x global average focus time</p>
          </div>
          {velocityLoading && <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-red-200/80 bg-red-50 text-[10px] font-black uppercase tracking-[0.2em] text-red-700">
                <th className="p-6">Student</th>
                <th className="p-6">Lesson</th>
                <th className="p-6">Velocity Score</th>
                <th className="p-6">Interrupt Rate</th>
                <th className="p-6">Time Spent / Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-500/10">
              {(() => {
                try {
                  return velocityData && velocityData.map((item, idx) => (
                    <tr key={`${item.user_id}_${item.lesson_id}`} className="hover:bg-red-500/5 transition-colors">
                      <td className="max-w-xs truncate p-6 font-bold text-slate-900">{item.email.split('@')[0] || 'Student'}</td>
                      <td className="max-w-[200px] truncate p-6 font-bold text-slate-700" title={item.lesson_name}>{item.lesson_name}</td>
                      <td className="p-6">
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black tabular-nums">
                          {item.velocity_score}x
                        </span>
                      </td>
                      <td className="p-6 font-black text-red-400 tabular-nums">{item.interrupt_rate}%</td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                          <span className="text-slate-900">{item.duration}m</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-sky-700">{item.global_average}m</span>
                        </div>
                      </td>
                    </tr>
                  ));
                } catch (e) {
                  console.error('Failed to render velocity data:', e);
                  return null;
                }
              })()}
              {(!velocityData || velocityData.length === 0) && !velocityLoading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-emerald-500 italic font-medium">No students currently meet early warning criteria. Excellence prevails.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
