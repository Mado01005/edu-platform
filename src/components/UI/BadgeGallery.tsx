'use client';

import { useState, useEffect } from 'react';
import { ACHIEVEMENTS } from '@/lib/achievements';

interface AchievementStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export default function BadgeGallery() {
  const [achievements, setAchievements] = useState<AchievementStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch('/api/user/achievements');
        if (res.ok) {
          const data = await res.json();
          setAchievements(data);
        }
      } catch (err) {
        console.error('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 gap-4 animate-pulse md:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-40 rounded-2xl border border-emerald-950/10 bg-white"></div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
      {achievements.map((ach) => (
        <div 
          key={ach.id} 
          className={`group relative flex min-w-0 flex-col items-center rounded-2xl border bg-white p-5 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${ach.isUnlocked ? 'border-emerald-200' : 'border-emerald-950/10 opacity-60 grayscale'}`}
        >
          <div 
            className="relative z-10 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border text-4xl transition"
            style={{ 
              backgroundColor: ach.isUnlocked ? '#f0f9ff' : '#f8fafc',
              borderColor: ach.isUnlocked ? '#bae6fd' : '#e2e8f0',
            }}
          >
            {ach.icon}
          </div>

          <h4 className="mb-2 break-words text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-900 transition-colors group-hover:text-[#084B2B]">{ach.name}</h4>
          <p className="text-[10px] font-medium leading-relaxed text-slate-500">{ach.description}</p>
          
          {ach.isUnlocked && (
             <div className="mt-4 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
               <span className="text-[8px] font-semibold uppercase tracking-wider text-[#084B2B]">Achieved</span>
             </div>
          )}
        </div>
      ))}
    </div>
  );
}
