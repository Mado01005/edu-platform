'use client';

import { useEffect, useRef } from 'react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
  vimeoId: string;
  title: string;
}

export default function VimeoPlayer({ vimeoId, title }: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchDataRef = useRef({ maxWatchedPercentage: 0, secondsWatched: 0 });

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
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-bold text-gray-300 truncate tracking-wide">{title}</span>
        <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-[inset_0_0_8px_rgba(99,102,241,0.1)]">Vimeo</span>
      </div>
    </div>
  );
}
