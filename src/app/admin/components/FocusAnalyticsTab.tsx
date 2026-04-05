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
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-4 border border-red-500/20 rounded-xl bg-red-500/10">Error: {error}</div>;
  }

  if (!data || (data.totalFocusMinutes === 0 && data.frictionList.length === 0)) {
    return (
      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
        <div className="text-6xl mb-4">🎧</div>
        <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Awaiting Student Data</h3>
        <p className="text-gray-400 text-sm">Focus telemetry streams will visualize here once students activate Deep Work sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="space-y-2 max-w-2xl text-center md:text-left mx-auto md:mx-0">
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Productivity Pulse</h2>
        <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest leading-relaxed">God Mode Overview</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-8 rounded-[2.5rem]">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Global Focus Time</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tabular-nums">
              {Math.floor(data.totalFocusMinutes / 60)}
            </span>
            <span className="text-lg font-bold text-gray-500">hrs</span>
            <span className="text-5xl font-black text-white tabular-nums">
              {data.totalFocusMinutes % 60}
            </span>
            <span className="text-lg font-bold text-gray-500">mins</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-8 rounded-[2.5rem]">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Global Completion Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tabular-nums">
              {data.globalCompletionRate.toFixed(1)}
            </span>
            <span className="text-3xl font-bold text-indigo-400">%</span>
          </div>
        </div>
      </div>

      {/* Friction Map */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/10">
          <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="text-red-500">🔥</span> Content Friction Heatmap
          </h3>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Top lessons with highest interruption rates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-black/20 border-b border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <th className="p-6">Rank</th>
                <th className="p-6">Lesson Name</th>
                <th className="p-6 bg-red-950/20 text-red-500">Interrupts</th>
                <th className="p-6 text-emerald-500">Completions</th>
                <th className="p-6">Fail Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.frictionList.map((item, idx) => {
                const total = item.completed + item.interrupted;
                const failRate = total > 0 ? (item.interrupted / total) * 100 : 0;
                
                return (
                  <tr key={item.lesson_id} className="hover:bg-white/5 transition-colors">
                    <td className="p-6 flex items-center gap-2">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${idx < 3 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-white max-w-xs truncate" title={item.title}>
                      {item.title}
                    </td>
                    <td className="p-6 font-black text-red-400 tabular-nums bg-red-950/20">{item.interrupted}</td>
                    <td className="p-6 font-bold text-emerald-400 tabular-nums">{item.completed}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white tabular-nums w-12">{failRate.toFixed(0)}%</span>
                        <div className="flex-1 h-2 bg-black rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-red-500" style={{ width: `${failRate}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.frictionList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500 italic font-medium">No friction data recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Early Warning / Intervention Panel */}
      <div className="bg-white/5 border border-red-500/30 rounded-[2.5rem] overflow-hidden">
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
              <tr className="bg-black/40 border-b border-red-500/10 text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                <th className="p-6">Student</th>
                <th className="p-6">Lesson</th>
                <th className="p-6">Velocity Score</th>
                <th className="p-6">Interrupt Rate</th>
                <th className="p-6">Time Spent / Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-500/10">
              {velocityData && velocityData.map((item, idx) => (
                <tr key={`${item.user_id}_${item.lesson_id}`} className="hover:bg-red-500/5 transition-colors">
                  <td className="p-6 font-bold text-white max-w-xs truncate">{item.email}</td>
                  <td className="p-6 font-bold text-gray-300 max-w-[200px] truncate" title={item.lesson_name}>{item.lesson_name}</td>
                  <td className="p-6">
                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black tabular-nums">
                      {item.velocity_score}x
                    </span>
                  </td>
                  <td className="p-6 font-black text-red-400 tabular-nums">{item.interrupt_rate}%</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-xs font-bold tabular-nums">
                      <span className="text-white">{item.duration}m</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-indigo-400">{item.global_average}m</span>
                    </div>
                  </td>
                </tr>
              ))}
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
