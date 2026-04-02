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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-40 bg-white/5 rounded-[2.5rem] border border-white/5"></div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {achievements.map((ach) => (
        <div 
          key={ach.id} 
          className={`relative group bg-[#0A0A0F] border rounded-[2.5rem] p-6 flex flex-col items-center text-center transition-all duration-700 hover:scale-105 ${ach.isUnlocked ? 'border-indigo-500/30' : 'border-white/5 opacity-40 grayscale'}`}
        >
          {ach.isUnlocked && (
            <div className="absolute inset-0 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-all"></div>
          )}
          
          <div 
            className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl mb-4 relative z-10 border transition-all duration-500"
            style={{ 
              backgroundColor: ach.isUnlocked ? `${ach.color}15` : '#111',
              borderColor: ach.isUnlocked ? `${ach.color}30` : '#222',
              boxShadow: ach.isUnlocked ? `0 0 30px ${ach.color}15` : 'none'
            }}
          >
            {ach.icon}
          </div>

          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 text-white/90 group-hover:text-indigo-400 transition-colors">{ach.name}</h4>
          <p className="text-[9px] text-gray-500 font-bold leading-relaxed">{ach.description}</p>
          
          {ach.isUnlocked && (
             <div className="mt-4 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
               <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Achieved</span>
             </div>
          )}
        </div>
      ))}
    </div>
  );
}
