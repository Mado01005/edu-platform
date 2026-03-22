'use client';

import { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
  vimeoId: string;
  title: string;
}

export default function VimeoPlayer({ vimeoId, title }: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchDataRef = useRef({ maxWatchedPercentage: 0, secondsWatched: 0 });
  const [resumeMessage, setResumeMessage] = useState('');

  // Extract ID if a full URL was pasted into the .vimeo text file
  const idMatch = vimeoId.match(/(?:vimeo\.com\/|video\/)(\d+)/);
  const finalId = idMatch ? idMatch[1] : vimeoId.trim();

  useEffect(() => {
    if (!containerRef.current || playerRef.current) return;

    const player = new Player(containerRef.current, {
      id: parseInt(finalId),
      autoplay: false,
      responsive: true
    });

    playerRef.current = player;

    player.on('timeupdate', (data: any) => {
      // data.percent is between 0 and 1
      const pct = Math.round(data.percent * 100);
      if (pct > watchDataRef.current.maxWatchedPercentage) {
         watchDataRef.current.maxWatchedPercentage = pct;
      }
      watchDataRef.current.secondsWatched = data.seconds;
      
      // Auto-save precise timestamp to cache strictly every 2 seconds to reduce I/O thrashing
      if (Math.round(data.seconds) % 2 === 0) {
         localStorage.setItem(`edu_resume_time_${finalId}`, String(data.seconds));
      }
    });

    player.on('loaded', () => {
      const savedTimeRaw = localStorage.getItem(`edu_resume_time_${finalId}`);
      if (savedTimeRaw) {
        const savedTime = parseFloat(savedTimeRaw);
        // Only trigger resume if they were meaningfully deep into the video (>15 secs)
        if (savedTime > 15) {
          player.setCurrentTime(savedTime).catch(() => {});
          
          const minutes = Math.floor(savedTime / 60);
          const seconds = Math.floor(savedTime % 60);
          const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
          
          setResumeMessage(`Welcome back! Resuming right where you left off at ${timeString}`);
          setTimeout(() => setResumeMessage(''), 4500); // Cinematic fade out after 4.5s
        }
      }
    });

    // Cleanup and send telemetry when video unmounts or page changes
    const sendTelemetry = () => {
      if (watchDataRef.current.maxWatchedPercentage > 5) { // Only log if they watched > 5%
        fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'WATCHED_VIDEO', 
            details: { 
              video_title: title, 
              vimeo_id: finalId, 
              watched_percentage: watchDataRef.current.maxWatchedPercentage,
              seconds_watched: Math.round(watchDataRef.current.secondsWatched)
            } 
          })
        }).catch(() => {});
      }
    };

    return () => {
      sendTelemetry();
      player.destroy().catch(() => {});
    };
  }, [finalId, title]);

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full border-0 rounded-2xl shadow-inner bg-black/50" />
        
        {/* Netflix-style Cinematic Resume Overlay */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 transition-all duration-700 pointer-events-none ${resumeMessage ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform -translate-y-4 scale-95'}`}>
          <div className="bg-black/80 backdrop-blur-md border border-indigo-500/30 px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></div>
             <p className="text-indigo-100 text-sm font-bold tracking-wide whitespace-nowrap">{resumeMessage}</p>
          </div>
        </div>

      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-bold text-gray-300 truncate tracking-wide">{title}</span>
        <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-[inset_0_0_8px_rgba(99,102,241,0.1)]">Vimeo</span>
      </div>
    </div>
  );
}
