'use client';

import React, { useEffect, useState } from 'react';
import { useSpotify } from '@/context/SpotifyContext';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

const MusicPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, previousTrack, isActive, hasToken, transferPlayback } = useSpotify();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastLoggedTrack, setLastLoggedTrack] = useState<string | null>(null);

  // Telemetry Hook: Log when track changes
  useEffect(() => {
    if (currentTrack && currentTrack.uri !== lastLoggedTrack) {
      setLastLoggedTrack(currentTrack.uri);
      
      // Silently log to Supabase via our internal API
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PLAYED_SONG',
          details: {
            trackName: currentTrack.name,
            artist: currentTrack.artist,
            spotifyUri: currentTrack.uri
          }
        })
      }).catch(err => console.error('Spotify Telemetry Error:', err));
    }
  }, [currentTrack, lastLoggedTrack]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 h-32 bg-red-500 text-white border-4 border-yellow-400 p-4 shadow-2xl overflow-y-auto">
      <div className="flex flex-col gap-2">
        <p className="font-bold text-xs uppercase tracking-widest text-yellow-300">Spotify Debug Mode</p>
        
        {!hasToken ? (
          <button 
            onClick={() => signIn('spotify')}
            className="w-full bg-black text-white font-black py-2 rounded border-2 border-white hover:bg-white hover:text-black transition-all"
          >
            LOGIN TO SPOTIFY
          </button>
        ) : !isActive || !currentTrack ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold">Connected: ✅</p>
            <button 
              onClick={transferPlayback}
              className="w-full bg-white text-black font-bold py-1 px-2 rounded text-xs"
            >
              Force Transfer Playback
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {currentTrack.albumArt && (
              <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0">
                <Image src={currentTrack.albumArt} alt="Art" fill className="object-cover" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold truncate">{currentTrack.name}</p>
              <div className="flex gap-2 mt-1">
                <button onClick={togglePlay} className="p-1 bg-white text-black rounded text-[10px] font-bold">
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button onClick={nextTrack} className="p-1 bg-white text-black rounded text-[10px] font-bold">
                  SKIP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
};

export default MusicPlayer;
